-- Add tier_id to allowlist for admin invite flow
-- Allows admins to specify user tier when inviting (defaults to premium)

-- Add tier_id column to allowlist
ALTER TABLE public.allowlist
ADD COLUMN tier_id TEXT REFERENCES public.user_tiers(id) DEFAULT 'premium';

-- Update handle_new_user to use allowlist tier when available
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_email TEXT;
  invite_code TEXT;
  new_tier TEXT;
BEGIN
  -- Get admin email from config
  SELECT value INTO admin_email FROM public.config WHERE key = 'admin_email';

  -- Get invite code from user metadata (if invited via Premium user)
  invite_code := NEW.raw_user_meta_data->>'invite_code';

  -- Determine tier: admin email gets admin tier, otherwise check allowlist
  IF LOWER(NEW.email) = LOWER(admin_email) THEN
    new_tier := 'admin';
  ELSE
    -- Check allowlist for tier (set by admin invite)
    SELECT tier_id INTO new_tier FROM public.allowlist WHERE email = LOWER(NEW.email);
    new_tier := COALESCE(new_tier, 'standard');
  END IF;

  -- Create profile with determined tier
  INSERT INTO public.profiles (id, email, is_admin, tier_id)
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    LOWER(NEW.email) = LOWER(admin_email),
    new_tier
  );

  -- Complete invite redemption if this user was invited
  IF invite_code IS NOT NULL THEN
    PERFORM public.complete_invite_redemption(invite_code, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
