-- Storage Enhancements Migration
-- Creates photos and generations tables, storage buckets, and RLS policies

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create input-photos bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'input-photos',
  'input-photos',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================

-- Input photos bucket policies
CREATE POLICY "Users can upload to own folder in input-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'input-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own photos in input-photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'input-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own photos in input-photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'input-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Avatars bucket policies
CREATE POLICY "Users can view own avatars"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: Avatar uploads are done by edge function using service role key

-- ============================================================================
-- PHOTOS TABLE
-- ============================================================================

CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photos_user_created ON public.photos(user_id, created_at DESC);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own photos"
ON public.photos FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos"
ON public.photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
ON public.photos FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all photos"
ON public.photos FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================================================
-- GENERATIONS TABLE
-- ============================================================================

CREATE TABLE public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL,
  output_storage_path TEXT NOT NULL,
  style TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  name_text TEXT,
  name_placement TEXT,
  custom_style TEXT,
  custom_placement TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd NUMERIC(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generations_user_created ON public.generations(user_id, created_at DESC);

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Users can view own generations (but cost columns hidden via view or app logic)
CREATE POLICY "Users can view own generations"
ON public.generations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can insert own generations (typically done via edge function)
CREATE POLICY "Users can insert own generations"
ON public.generations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all generations (including costs)
CREATE POLICY "Admins can view all generations"
ON public.generations FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Get user's generation count for today (UTC)
CREATE OR REPLACE FUNCTION public.get_daily_generation_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.generations
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
$$;

-- Get user quota info
CREATE OR REPLACE FUNCTION public.get_user_quota()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  usage_count INTEGER;
  daily_limit INTEGER := 20;
  is_user_admin BOOLEAN;
BEGIN
  -- Check if admin (unlimited)
  SELECT is_admin INTO is_user_admin
  FROM public.profiles WHERE id = current_user_id;

  IF is_user_admin THEN
    RETURN json_build_object(
      'limit', -1,
      'used', 0,
      'remaining', -1,
      'is_admin', true
    );
  END IF;

  -- Count today's generations
  SELECT public.get_daily_generation_count(current_user_id) INTO usage_count;

  RETURN json_build_object(
    'limit', daily_limit,
    'used', usage_count,
    'remaining', GREATEST(0, daily_limit - usage_count),
    'is_admin', false
  );
END;
$$;

-- Admin: Get user stats
CREATE OR REPLACE FUNCTION public.admin_get_user_stats()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  is_admin BOOLEAN,
  total_generations BIGINT,
  total_cost NUMERIC,
  generations_today BIGINT,
  last_generation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id as user_id,
    p.email,
    p.is_admin,
    COUNT(g.id) as total_generations,
    COALESCE(SUM(g.cost_usd), 0) as total_cost,
    COUNT(g.id) FILTER (WHERE g.created_at >= CURRENT_DATE) as generations_today,
    MAX(g.created_at) as last_generation_at,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.generations g ON g.user_id = p.id
  GROUP BY p.id, p.email, p.is_admin, p.created_at
  ORDER BY COUNT(g.id) DESC;
END;
$$;

-- Admin: Get recent generations with user info
CREATE OR REPLACE FUNCTION public.admin_get_recent_generations(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  style TEXT,
  crop_type TEXT,
  name_text TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    p.email as user_email,
    g.style,
    g.crop_type,
    g.name_text,
    g.prompt_tokens,
    g.completion_tokens,
    g.total_tokens,
    g.cost_usd,
    g.created_at
  FROM public.generations g
  JOIN public.profiles p ON p.id = g.user_id
  ORDER BY g.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_daily_generation_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_quota() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_generations(INTEGER, INTEGER) TO authenticated;
