-- Avatarz Schema Migration
-- Creates allowlist, profiles, and config tables with RLS policies

-- Config table for admin email (avoid hardcoding)
CREATE TABLE public.config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO public.config (key, value) VALUES ('admin_email', 'ajchesney@gmail.com');

-- Create allowlist table
CREATE TABLE public.allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.allowlist ENABLE ROW LEVEL SECURITY;

-- SECURITY FIX: Use RPC function instead of exposing entire allowlist
-- This function only returns true/false, not the email itself
CREATE OR REPLACE FUNCTION public.check_email_allowlisted(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.allowlist
    WHERE email = LOWER(email_to_check)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon for login check
GRANT EXECUTE ON FUNCTION public.check_email_allowlisted(TEXT) TO anon;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for admin lookups
CREATE INDEX idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admin can manage allowlist
CREATE POLICY "Admin can manage allowlist"
ON public.allowlist FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_email TEXT;
BEGIN
  SELECT value INTO admin_email FROM public.config WHERE key = 'admin_email';

  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email = admin_email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed admin email in allowlist
INSERT INTO public.allowlist (email) VALUES ('ajchesney@gmail.com');
