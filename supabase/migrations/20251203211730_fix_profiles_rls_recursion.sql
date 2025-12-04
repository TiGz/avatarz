-- Fix infinite recursion in profiles RLS policy
-- The "Admin can view all profiles" policy was querying profiles table within itself

-- First, create a SECURITY DEFINER function to check admin status
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = user_id),
    false
  );
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- Recreate using the function instead of subquery
CREATE POLICY "Admin can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Also fix the allowlist policy which has the same issue
DROP POLICY IF EXISTS "Admin can manage allowlist" ON public.allowlist;

CREATE POLICY "Admin can manage allowlist"
ON public.allowlist FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Fix the policies in the storage_enhancements migration that reference profiles
-- These also have the same recursion issue

DROP POLICY IF EXISTS "Admins can view all photos" ON public.photos;

CREATE POLICY "Admins can view all photos"
ON public.photos FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all generations" ON public.generations;

CREATE POLICY "Admins can view all generations"
ON public.generations FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
