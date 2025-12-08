-- Add private tier (same limits as standard, no invites)
-- Private users' avatars are always private and never appear in public showcases
INSERT INTO public.user_tiers (id, label, daily_generation_limit, daily_invite_limit, can_create_invites, sort_order)
VALUES ('private', 'Private', 20, 0, false, 4);
