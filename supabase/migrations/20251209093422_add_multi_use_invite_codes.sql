-- Multi-Use Invite Codes Migration
-- Replaces is_redeemed boolean with max_uses/times_used integers

-- ============================================================================
-- ADD NEW COLUMNS
-- ============================================================================

ALTER TABLE public.invite_codes
  ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN times_used INTEGER NOT NULL DEFAULT 0;

-- Add constraints
ALTER TABLE public.invite_codes
  ADD CONSTRAINT valid_max_uses CHECK (max_uses BETWEEN 1 AND 50),
  ADD CONSTRAINT valid_times_used CHECK (times_used >= 0 AND times_used <= max_uses);

-- ============================================================================
-- BACKFILL EXISTING DATA
-- ============================================================================

-- Existing redeemed codes should show as 1/1 used
UPDATE public.invite_codes
SET times_used = 1
WHERE is_redeemed = true;

-- ============================================================================
-- DROP OLD COLUMNS
-- ============================================================================

-- Drop the old constraint that referenced is_redeemed
ALTER TABLE public.invite_codes
  DROP CONSTRAINT IF EXISTS valid_redemption;

-- Drop the partial index on is_redeemed
DROP INDEX IF EXISTS idx_invite_codes_code;

-- Drop old columns
ALTER TABLE public.invite_codes
  DROP COLUMN is_redeemed,
  DROP COLUMN redeemed_by,
  DROP COLUMN redeemed_at,
  DROP COLUMN redeemed_email;

-- Create new index for code lookups (no partial filter needed now)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes(code);

-- ============================================================================
-- UPDATE claim_invite_code FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_invite_code(invite_code TEXT, user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code RECORD;
BEGIN
  user_email := LOWER(TRIM(user_email));

  -- Lock and fetch code
  SELECT id, created_by, tier_granted, max_uses, times_used, expires_at
  INTO v_code
  FROM public.invite_codes
  WHERE code = UPPER(invite_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Invite code has expired');
  END IF;

  IF v_code.times_used >= v_code.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'All invite slots have been used');
  END IF;

  -- Check if email already registered
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN json_build_object('success', false, 'error', 'Email already registered');
  END IF;

  -- Increment counter (atomic with FOR UPDATE lock)
  UPDATE public.invite_codes
  SET times_used = times_used + 1
  WHERE id = v_code.id;

  RETURN json_build_object(
    'success', true,
    'invite_id', v_code.id,
    'created_by', v_code.created_by,
    'tier_granted', v_code.tier_granted
  );
END;
$$;

-- ============================================================================
-- UPDATE get_my_invite_codes FUNCTION
-- ============================================================================

-- Drop and recreate since return type is changing
DROP FUNCTION IF EXISTS public.get_my_invite_codes();

CREATE OR REPLACE FUNCTION public.get_my_invite_codes()
RETURNS TABLE (
  invite_id UUID,
  invite_code TEXT,
  invite_max_uses INTEGER,
  invite_times_used INTEGER,
  invite_tier_granted TEXT,
  invite_expires_at TIMESTAMPTZ,
  invite_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ic.id,
    ic.code,
    ic.max_uses,
    ic.times_used,
    ic.tier_granted,
    ic.expires_at,
    ic.created_at
  FROM public.invite_codes ic
  WHERE ic.created_by = auth.uid()
  ORDER BY ic.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_invite_codes() TO authenticated;

-- ============================================================================
-- DROP complete_invite_redemption (NO LONGER NEEDED)
-- ============================================================================

-- The counter increment happens in claim_invite_code now, no separate completion step
DROP FUNCTION IF EXISTS public.complete_invite_redemption(TEXT, UUID);

-- ============================================================================
-- UPDATE handle_new_user TRIGGER (REMOVE INVITE CODE COMPLETION)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Note: invite code redemption counter is now incremented in claim_invite_code
  -- No need to call complete_invite_redemption here

  RETURN NEW;
END;
$$;

-- ============================================================================
-- UPDATE admin_set_user_tier (USE NEW COLUMNS)
-- ============================================================================

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
