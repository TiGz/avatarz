-- Migration: Add function to upgrade age group from under_18 to 18_plus
-- This is a one-way upgrade - users cannot go back to under_18

CREATE OR REPLACE FUNCTION public.upgrade_to_adult()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_age_group TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get current age group
  SELECT age_group INTO current_age_group
  FROM public.profiles WHERE id = current_user_id;

  -- Only allow upgrade from under_18
  IF current_age_group IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Please complete onboarding first');
  END IF;

  IF current_age_group = '18_plus' THEN
    RETURN json_build_object('success', false, 'error', 'Already set as 18+');
  END IF;

  -- Upgrade to 18_plus (keep is_private_account as-is, user can now change it)
  UPDATE public.profiles
  SET age_group = '18_plus'
  WHERE id = current_user_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upgrade_to_adult() TO authenticated;
