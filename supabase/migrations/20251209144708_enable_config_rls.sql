-- Enable RLS on config table to prevent unauthorized access
-- The config table stores sensitive data like admin_email

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (prevents bypassing)
ALTER TABLE public.config FORCE ROW LEVEL SECURITY;

-- No policies defined = no access for anon/authenticated roles
-- service_role and postgres (used by SECURITY DEFINER functions) bypass RLS
