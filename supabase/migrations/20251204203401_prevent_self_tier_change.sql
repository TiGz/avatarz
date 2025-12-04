-- Prevent admins from changing their own tier
-- This adds a safety check to admin_set_user_tier() function

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

  -- Prevent self-modification
  IF target_user_id = caller_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot change your own tier');
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
