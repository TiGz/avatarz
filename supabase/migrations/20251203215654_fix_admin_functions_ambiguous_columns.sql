-- Fix ambiguous column references in admin functions
-- The RETURNS TABLE column names conflict with table column names in PL/pgSQL
-- Must drop and recreate because we're changing return types

-- Drop existing functions
DROP FUNCTION IF EXISTS public.admin_get_recent_generations(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.admin_get_user_stats();

-- Recreate admin_get_recent_generations with prefixed column names
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
  gen_created_at TIMESTAMPTZ
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
    g.created_at
  FROM public.generations g
  JOIN public.profiles p ON p.id = g.user_id
  ORDER BY g.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Recreate admin_get_user_stats with prefixed column names
CREATE FUNCTION public.admin_get_user_stats()
RETURNS TABLE (
  stat_user_id UUID,
  stat_email TEXT,
  stat_is_admin BOOLEAN,
  stat_total_generations BIGINT,
  stat_total_cost NUMERIC,
  stat_generations_today BIGINT,
  stat_last_generation_at TIMESTAMPTZ,
  stat_created_at TIMESTAMPTZ
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
    p.id,
    p.email,
    p.is_admin,
    COUNT(g.id),
    COALESCE(SUM(g.cost_usd), 0),
    COUNT(g.id) FILTER (WHERE g.created_at >= CURRENT_DATE),
    MAX(g.created_at),
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.generations g ON g.user_id = p.id
  GROUP BY p.id, p.email, p.is_admin, p.created_at
  ORDER BY COUNT(g.id) DESC;
END;
$$;

-- Re-grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_generations(INTEGER, INTEGER) TO authenticated;
