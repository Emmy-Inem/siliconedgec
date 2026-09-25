-- Helper function to safely read secrets from vault.decrypted_secrets or site_content by service_role
CREATE OR REPLACE FUNCTION public.get_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  sec text;
BEGIN
  -- 1. Try vault.decrypted_secrets first (case-insensitive)
  BEGIN
    SELECT decrypted_secret INTO sec
    FROM vault.decrypted_secrets
    WHERE lower(name) = lower(secret_name)
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    sec := NULL;
  END;

  -- 2. If not found in vault, check site_content
  IF sec IS NULL THEN
    SELECT value INTO sec
    FROM public.site_content
    WHERE lower(key) = lower(secret_name)
    LIMIT 1;
  END IF;

  RETURN sec;
END;
$$;

-- Protect secret reader: only service_role should call this function
REVOKE ALL ON FUNCTION public.get_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_secret(text) TO service_role;

-- Add payment_gateway and stripe_session_id to orders table if not present
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'paystack',
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
