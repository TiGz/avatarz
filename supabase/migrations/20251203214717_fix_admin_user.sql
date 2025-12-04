-- Fix admin user - ensure ajchesney@gmail.com is marked as admin
-- This handles cases where the profile was created before the admin trigger was set up

UPDATE public.profiles
SET is_admin = true
WHERE email = 'ajchesney@gmail.com';
