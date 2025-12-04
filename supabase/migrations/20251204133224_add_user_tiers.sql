-- User Tier System Migration
-- Creates user_tiers table and adds tier_id to profiles

-- ============================================================================
-- USER TIERS TABLE
-- ============================================================================

CREATE TABLE public.user_tiers (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  daily_generation_limit INTEGER NOT NULL, -- -1 = unlimited
  daily_invite_limit INTEGER NOT NULL,     -- -1 = unlimited, 0 = none
  can_create_invites BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL
);

-- Seed tier data
INSERT INTO public.user_tiers (id, label, daily_generation_limit, daily_invite_limit, can_create_invites, sort_order)
VALUES
  ('admin', 'Admin', -1, -1, true, 1),
  ('premium', 'Premium', 50, 3, true, 2),
  ('standard', 'Standard', 20, 0, false, 3);

-- Public read access (tiers are not sensitive)
ALTER TABLE public.user_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tiers" ON public.user_tiers FOR SELECT USING (true);

-- ============================================================================
-- ADD TIER_ID TO PROFILES
-- ============================================================================

-- Add tier column to profiles
ALTER TABLE public.profiles
ADD COLUMN tier_id TEXT REFERENCES public.user_tiers(id) DEFAULT 'standard';

-- Backfill: existing admins get admin tier, others get standard
UPDATE public.profiles SET tier_id = 'admin' WHERE is_admin = true;
UPDATE public.profiles SET tier_id = 'standard' WHERE tier_id IS NULL;

-- Make tier_id NOT NULL after backfill
ALTER TABLE public.profiles ALTER COLUMN tier_id SET NOT NULL;

-- Index for tier-based queries
CREATE INDEX idx_profiles_tier ON public.profiles(tier_id);

-- ============================================================================
-- INVITE CODES TABLE
-- ============================================================================

CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_redeemed BOOLEAN DEFAULT false,
  redeemed_by UUID REFERENCES public.profiles(id),
  redeemed_at TIMESTAMPTZ,
  redeemed_email TEXT,

  -- Ensure consistent redemption state
  CONSTRAINT valid_redemption CHECK (
    (is_redeemed = false AND redeemed_by IS NULL AND redeemed_at IS NULL) OR
    (is_redeemed = true AND redeemed_by IS NOT NULL AND redeemed_at IS NOT NULL AND redeemed_email IS NOT NULL)
  )
);

-- Indexes for fast lookups
CREATE INDEX idx_invite_codes_code ON public.invite_codes(code) WHERE is_redeemed = false;
CREATE INDEX idx_invite_codes_created_by ON public.invite_codes(created_by, created_at DESC);

-- RLS policies
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own invite codes
CREATE POLICY "Users can view own invites"
  ON public.invite_codes FOR SELECT
  USING (created_by = auth.uid());

-- Admins can view all invite codes
CREATE POLICY "Admins can view all invites"
  ON public.invite_codes FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Only Premium/Admin can create invites (enforced via edge function, not RLS)
-- RLS allows insert for any authenticated user; edge function validates tier
CREATE POLICY "Authenticated users can create invites"
  ON public.invite_codes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- No direct updates (use SECURITY DEFINER functions)
CREATE POLICY "No direct updates"
  ON public.invite_codes FOR UPDATE
  USING (false);

-- No direct deletes (admins can delete via SECURITY DEFINER function)
CREATE POLICY "No direct deletes"
  ON public.invite_codes FOR DELETE
  USING (false);

-- ============================================================================
-- SQL FUNCTIONS
-- ============================================================================

-- Get user's tier ID (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_tier(user_id UUID)
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(tier_id, 'standard') FROM public.profiles WHERE id = user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_tier(UUID) TO authenticated;

-- Replace existing get_user_quota with tier-aware version
CREATE OR REPLACE FUNCTION public.get_user_quota()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
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

-- Get user's daily invite quota
CREATE OR REPLACE FUNCTION public.get_invite_quota()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION public.get_invite_quota() TO authenticated;

-- Atomically claim an invite code (prevents race conditions)
CREATE OR REPLACE FUNCTION public.claim_invite_code(
  invite_code TEXT,
  user_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Lock the row for update (prevents concurrent redemption)
  SELECT * INTO invite_record
  FROM public.invite_codes
  WHERE code = invite_code
  FOR UPDATE;

  -- Validate invite exists
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invite code not found');
  END IF;

  -- Validate not already redeemed
  IF invite_record.is_redeemed THEN
    RETURN json_build_object('success', false, 'error', 'Invite code already used');
  END IF;

  -- Validate not expired
  IF invite_record.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Invite code expired');
  END IF;

  -- Mark invite as pending (store email, not yet fully redeemed)
  UPDATE public.invite_codes
  SET redeemed_email = user_email
  WHERE code = invite_code;

  RETURN json_build_object(
    'success', true,
    'invite_id', invite_record.id,
    'created_by', invite_record.created_by
  );
END;
$$;

-- Complete invite redemption after user successfully signs up
CREATE OR REPLACE FUNCTION public.complete_invite_redemption(
  invite_code TEXT,
  new_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.invite_codes
  SET
    is_redeemed = true,
    redeemed_by = new_user_id,
    redeemed_at = NOW()
  WHERE code = invite_code
    AND is_redeemed = false;
END;
$$;

-- Admin function to change user tier
CREATE OR REPLACE FUNCTION public.admin_set_user_tier(
  target_user_id UUID,
  new_tier_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
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

  -- If demoting from Premium, invalidate their pending invites
  IF old_tier = 'premium' AND new_tier_id = 'standard' THEN
    DELETE FROM public.invite_codes
    WHERE created_by = target_user_id
      AND is_redeemed = false;
  END IF;

  RETURN json_build_object(
    'success', true,
    'old_tier', old_tier,
    'new_tier', new_tier_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_tier(UUID, TEXT) TO authenticated;

-- Update handle_new_user trigger to handle invite codes and tiers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_email TEXT;
  invite_code TEXT;
BEGIN
  -- Get admin email from config
  SELECT value INTO admin_email FROM public.config WHERE key = 'admin_email';

  -- Get invite code from user metadata (if invited via Premium user)
  invite_code := NEW.raw_user_meta_data->>'invite_code';

  -- Create profile with appropriate tier
  INSERT INTO public.profiles (id, email, is_admin, tier_id)
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    LOWER(NEW.email) = LOWER(admin_email),
    CASE
      WHEN LOWER(NEW.email) = LOWER(admin_email) THEN 'admin'
      ELSE 'standard'
    END
  );

  -- Complete invite redemption if this user was invited
  IF invite_code IS NOT NULL THEN
    PERFORM public.complete_invite_redemption(invite_code, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Update admin_get_user_stats to include tier
-- Must drop first since return type is changing
DROP FUNCTION IF EXISTS public.admin_get_user_stats();

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

-- Get user's invite codes with status
CREATE OR REPLACE FUNCTION public.get_my_invite_codes()
RETURNS TABLE (
  invite_id UUID,
  invite_code TEXT,
  invite_created_at TIMESTAMPTZ,
  invite_expires_at TIMESTAMPTZ,
  invite_is_redeemed BOOLEAN,
  invite_redeemed_email TEXT,
  invite_redeemed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id as invite_id,
    i.code as invite_code,
    i.created_at as invite_created_at,
    i.expires_at as invite_expires_at,
    i.is_redeemed as invite_is_redeemed,
    i.redeemed_email as invite_redeemed_email,
    i.redeemed_at as invite_redeemed_at
  FROM public.invite_codes i
  WHERE i.created_by = auth.uid()
  ORDER BY i.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_invite_codes() TO authenticated;
