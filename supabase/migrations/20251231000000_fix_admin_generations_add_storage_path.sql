-- Fix: Add storage_path to admin_get_recent_generations so admin can view full images
-- This is needed because thumbnails are now generated client-side and might not exist

DROP FUNCTION IF EXISTS public.admin_get_recent_generations(INTEGER, INTEGER);

CREATE FUNCTION public.admin_get_recent_generations(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  gen_id UUID,
  user_email TEXT,
  gen_style TEXT,
  gen_crop_type TEXT,
  gen_name_text TEXT,
  gen_prompt_tokens INTEGER,
  gen_completion_tokens INTEGER,
  gen_total_tokens INTEGER,
  gen_cost_usd NUMERIC,
  gen_created_at TIMESTAMPTZ,
  gen_thumbnail_path TEXT,
  gen_storage_path TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    p.email,
    g.style,
    g.crop_type,
    g.name_text,
    g.prompt_tokens,
    g.completion_tokens,
    g.total_tokens,
    g.cost_usd,
    g.created_at,
    g.thumbnail_storage_path,
    g.storage_path
  FROM public.generations g
  JOIN public.profiles p ON p.id = g.user_id
  ORDER BY g.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_recent_generations(INTEGER, INTEGER) TO authenticated;
