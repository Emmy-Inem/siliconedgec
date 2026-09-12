
DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;

CREATE OR REPLACE FUNCTION public.validate_promo_code(p_code text)
RETURNS TABLE (
  id uuid,
  code text,
  discount_type text,
  discount_value numeric,
  influencer_name text,
  max_uses integer,
  usage_count integer,
  expires_at timestamptz,
  is_active boolean,
  slug text,
  landing_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, code, discount_type, discount_value, influencer_name,
         max_uses, usage_count, expires_at, is_active, slug, landing_path,
         utm_source, utm_medium, utm_campaign, utm_content
  FROM public.promo_codes
  WHERE upper(code) = upper(p_code) AND is_active = true
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.validate_promo_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO anon, authenticated;

-- Influencer landing redirect needs to resolve by slug too.
CREATE OR REPLACE FUNCTION public.resolve_promo_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  code text,
  influencer_name text,
  slug text,
  landing_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  is_active boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, code, influencer_name, slug, landing_path,
         utm_source, utm_medium, utm_campaign, utm_content, is_active
  FROM public.promo_codes
  WHERE slug = p_slug AND is_active = true
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_promo_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_promo_slug(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Quiz questions viewable by everyone" ON public.quiz_questions;
CREATE POLICY "Authenticated users can view quiz questions"
  ON public.quiz_questions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can verify certificate by code" ON public.certificates;

CREATE OR REPLACE FUNCTION public.verify_certificate(p_code text)
RETURNS TABLE (
  id uuid,
  course_id uuid,
  user_id uuid,
  verification_code text,
  issued_at timestamptz,
  recipient_name text,
  course_title text,
  course_category text,
  course_duration_hours numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.course_id, c.user_id, c.verification_code, c.issued_at,
         COALESCE(p.full_name, 'Verified Student'),
         co.title, co.category, co.duration_hours
  FROM public.certificates c
  LEFT JOIN public.courses co ON co.id = c.course_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE upper(c.verification_code) = upper(p_code)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.lead_sources;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END$$;

DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'live-class-reminder-15min';
  IF v_jobid IS NOT NULL THEN PERFORM cron.unschedule(v_jobid); END IF;
END$$;

SELECT cron.schedule(
  'live-class-reminder-15min',
  '*/15 * * * *',
  format(
    $cron$
    SELECT net.http_post(
      url := 'https://sdddxnjlgjjaoayyraxn.supabase.co/functions/v1/live-class-reminder',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer %s'
      ),
      body := '{}'::jsonb
    );
    $cron$,
    COALESCE(
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key' LIMIT 1),
      ''
    )
  )
);
