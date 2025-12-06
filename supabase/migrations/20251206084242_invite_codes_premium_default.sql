-- Make invite codes created by admins grant premium tier by default
-- Adds tier_granted column to track what tier the redeemed user should receive

-- Add tier_granted column to invite_codes table
ALTER TABLE public.invite_codes
ADD COLUMN tier_granted TEXT REFERENCES public.user_tiers(id) DEFAULT 'standard';

-- Backfill existing invite codes:
-- Admin-created invites should grant premium tier
UPDATE public.invite_codes ic
SET tier_granted = 'premium'
FROM public.profiles p
WHERE ic.created_by = p.id
  AND p.tier_id = 'admin';

-- Update claim_invite_code to return the tier_granted value
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
    'created_by', invite_record.created_by,
    'tier_granted', COALESCE(invite_record.tier_granted, 'standard')
  );
END;
$$;
