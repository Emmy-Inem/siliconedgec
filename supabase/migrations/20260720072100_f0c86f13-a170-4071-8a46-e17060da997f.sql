
DO $$
DECLARE f record;
  keep_public text[] := ARRAY[
    'resolve_promo_slug','validate_promo_code','verify_certificate',
    'get_public_profiles','is_ip_blocked'
  ];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    IF f.proname = ANY(keep_public) THEN CONTINUE; END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.sig);
  END LOOP;
END $$;
