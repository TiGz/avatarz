-- Fix mutable search_path in SECURITY DEFINER functions
-- Adds SET search_path = '' to all functions for security hardening
-- This forces fully-qualified object references and prevents search_path attacks

-- ============================================================================
-- check_email_allowlisted
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_email_allowlisted(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.allowlist
    WHERE email = LOWER(email_to_check)
  );
END;
$$;

-- ============================================================================
-- handle_new_user (trigger function)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_email TEXT;
  allowlist_tier TEXT;
BEGIN
  -- Get admin email from config
  SELECT value INTO admin_email FROM public.config WHERE key = 'admin_email';

  -- Check if user has a tier assigned in allowlist
  SELECT tier_id INTO allowlist_tier
  FROM public.allowlist
  WHERE email = LOWER(NEW.email);

  -- Create profile with appropriate tier
  INSERT INTO public.profiles (id, email, is_admin, tier_id)
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    LOWER(NEW.email) = LOWER(admin_email),
    CASE
      WHEN LOWER(NEW.email) = LOWER(admin_email) THEN 'admin'
      WHEN allowlist_tier IS NOT NULL THEN allowlist_tier
      ELSE 'standard'
    END
  );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- is_admin
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = user_id),
    false
  );
$$;

-- ============================================================================
-- get_daily_generation_count
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_daily_generation_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.generations
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
$$;

-- ============================================================================
-- get_user_quota
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_quota()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  user_tier_id TEXT;
  tier_limit INTEGER;
  generations_today INTEGER;
BEGIN
  -- Get user's tier
  SELECT tier_id INTO user_tier_id
  FROM public.profiles
  WHERE id = current_user_id;

  -- Get tier's daily limit
  SELECT daily_generation_limit INTO tier_limit
  FROM public.user_tiers
  WHERE id = user_tier_id;

  -- Fallback to 20 if tier not found
  tier_limit := COALESCE(tier_limit, 20);

  -- Count today's generations
  SELECT COUNT(*)::INTEGER INTO generations_today
  FROM public.generations
  WHERE user_id = current_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- Return quota info
  IF tier_limit = -1 THEN
    RETURN json_build_object(
      'tier', user_tier_id,
      'limit', -1,
      'used', generations_today,
      'remaining', -1,
      'is_admin', user_tier_id = 'admin'
    );
  ELSE
    RETURN json_build_object(
      'tier', user_tier_id,
      'limit', tier_limit,
      'used', generations_today,
      'remaining', GREATEST(0, tier_limit - generations_today),
      'is_admin', user_tier_id = 'admin'
    );
  END IF;
END;
$$;

-- ============================================================================
-- get_user_tier
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_tier(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(tier_id, 'standard') FROM public.profiles WHERE id = user_id;
$$;

-- ============================================================================
-- get_invite_quota
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_invite_quota()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  user_tier_id TEXT;
  tier_limit INTEGER;
  can_invite BOOLEAN;
  invites_today INTEGER;
BEGIN
  -- Get user's tier and permissions
  SELECT p.tier_id, t.daily_invite_limit, t.can_create_invites
  INTO user_tier_id, tier_limit, can_invite
  FROM public.profiles p
  JOIN public.user_tiers t ON t.id = p.tier_id
  WHERE p.id = current_user_id;

  -- Check permission
  IF NOT COALESCE(can_invite, false) THEN
    RETURN json_build_object(
      'can_create', false,
      'tier', user_tier_id,
      'reason', 'Tier does not have invite permissions'
    );
  END IF;

  -- Count today's invites
  SELECT COUNT(*)::INTEGER INTO invites_today
  FROM public.invite_codes
  WHERE created_by = current_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- Return quota info
  IF tier_limit = -1 THEN
    RETURN json_build_object(
      'can_create', true,
      'tier', user_tier_id,
      'limit', -1,
      'used', invites_today,
      'remaining', -1
    );
  ELSE
    RETURN json_build_object(
      'can_create', invites_today < tier_limit,
      'tier', user_tier_id,
      'limit', tier_limit,
      'used', invites_today,
      'remaining', GREATEST(0, tier_limit - invites_today)
    );
  END IF;
END;
$$;

-- ============================================================================
-- admin_set_user_tier
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_set_user_tier(
  target_user_id UUID,
  new_tier_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  old_tier TEXT;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(caller_id) THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Verify target tier exists
  IF NOT EXISTS (SELECT 1 FROM public.user_tiers WHERE id = new_tier_id) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid tier');
  END IF;

  -- Get old tier for response
  SELECT tier_id INTO old_tier FROM public.profiles WHERE id = target_user_id;

  -- Update tier
  UPDATE public.profiles
  SET tier_id = new_tier_id
  WHERE id = target_user_id;

  -- Also update is_admin flag to stay in sync
  UPDATE public.profiles
  SET is_admin = (new_tier_id = 'admin')
  WHERE id = target_user_id;

  -- If demoting from Premium, invalidate their unused invites
  IF old_tier = 'premium' AND new_tier_id = 'standard' THEN
    DELETE FROM public.invite_codes
    WHERE created_by = target_user_id
      AND times_used < max_uses;
  END IF;

  RETURN json_build_object(
    'success', true,
    'old_tier', old_tier,
    'new_tier', new_tier_id
  );
END;
$$;

-- ============================================================================
-- admin_get_user_stats
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_get_user_stats()
RETURNS TABLE (
  stat_user_id UUID,
  stat_email TEXT,
  stat_is_admin BOOLEAN,
  stat_tier TEXT,
  stat_total_generations BIGINT,
  stat_total_cost NUMERIC,
  stat_generations_today BIGINT,
  stat_last_generation_at TIMESTAMPTZ,
  stat_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id as stat_user_id,
    p.email as stat_email,
    p.is_admin as stat_is_admin,
    p.tier_id as stat_tier,
    COUNT(g.id) as stat_total_generations,
    COALESCE(SUM(g.cost_usd), 0) as stat_total_cost,
    COUNT(g.id) FILTER (WHERE g.created_at >= CURRENT_DATE) as stat_generations_today,
    MAX(g.created_at) as stat_last_generation_at,
    p.created_at as stat_created_at
  FROM public.profiles p
  LEFT JOIN public.generations g ON g.user_id = p.id
  GROUP BY p.id, p.email, p.is_admin, p.tier_id, p.created_at
  ORDER BY COUNT(g.id) DESC;
END;
$$;

-- ============================================================================
-- admin_get_recent_generations
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_get_recent_generations(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
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
  gen_thumbnail_path TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
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
    g.thumbnail_storage_path
  FROM public.generations g
  JOIN public.profiles p ON p.id = g.user_id
  ORDER BY g.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- get_random_public_avatars
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_random_public_avatars(count INT DEFAULT 3)
RETURNS TABLE (
  avatar_id UUID,
  thumbnail_path TEXT,
  style TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, thumbnail_storage_path, style, created_at
  FROM public.generations
  WHERE is_public = true
    AND thumbnail_storage_path IS NOT NULL
  ORDER BY RANDOM()
  LIMIT LEAST(count, 10);
$$;

-- ============================================================================
-- get_random_public_avatars_by_style
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_random_public_avatars_by_style(
  p_count INTEGER DEFAULT 3,
  p_style_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  avatar_id UUID,
  thumbnail_path TEXT,
  avatar_style TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, thumbnail_storage_path, style
  FROM public.generations
  WHERE is_public = true
    AND thumbnail_storage_path IS NOT NULL
    AND (p_style_id IS NULL OR style = p_style_id)
  ORDER BY RANDOM()
  LIMIT LEAST(p_count, 10);
$$;
