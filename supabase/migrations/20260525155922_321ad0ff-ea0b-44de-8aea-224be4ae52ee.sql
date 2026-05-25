
-- 1. Lock down SECURITY DEFINER functions
-- Revoke default PUBLIC execute on all our SECURITY DEFINER functions
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
  END LOOP;
END$$;

-- Grant back functions that ARE meant to be called as RPCs from the client
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.resolve_promo_slug(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_ip_blocked(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_login_locked(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.clear_login_lockout(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.influencer_click_counts() TO authenticated;
-- Trigger-only functions stay revoked — triggers run as definer regardless.

-- 2. Tighten "always true" RLS policies on public-submit tables
-- Require at least a non-empty email on public form submissions
DROP POLICY IF EXISTS "Anyone can submit business leads" ON public.business_leads;
CREATE POLICY "Anyone can submit business leads" ON public.business_leads
  FOR INSERT WITH CHECK (
    length(coalesce(email,'')) > 3 AND length(coalesce(contact_name,'')) > 0
  );

DROP POLICY IF EXISTS "Anyone can submit registrations" ON public.course_registrations;
CREATE POLICY "Anyone can submit registrations" ON public.course_registrations
  FOR INSERT WITH CHECK (
    length(coalesce(email,'')) > 3 AND length(coalesce(full_name,'')) > 0
  );

DROP POLICY IF EXISTS "Anyone can insert lead sources" ON public.lead_sources;
CREATE POLICY "Anyone can insert lead sources" ON public.lead_sources
  FOR INSERT WITH CHECK (
    coalesce(form_type,'') <> '' AND length(coalesce(landing_page,'')) < 2048
  );

-- 3. Restrict public bucket listing (direct public URLs still work for public buckets)
DROP POLICY IF EXISTS "Public read access for course thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Site media public read" ON storage.objects;
-- Authenticated users (e.g. admin/media library UI) can still list via authed select:
CREATE POLICY "Authenticated can list course thumbnails" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'course-thumbnails');
CREATE POLICY "Authenticated can list site media" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'site-media');

-- 4. Auto-recompute enrollment progress + completion when lesson_progress changes
CREATE OR REPLACE FUNCTION public.recompute_enrollment_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_lesson uuid;
  v_course uuid;
  v_total int;
  v_done int;
  v_pct numeric;
BEGIN
  v_user := COALESCE(NEW.user_id, OLD.user_id);
  v_lesson := COALESCE(NEW.lesson_id, OLD.lesson_id);

  SELECT m.course_id INTO v_course
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = v_lesson;

  IF v_course IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT count(*) INTO v_total
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE m.course_id = v_course;

  SELECT count(*) INTO v_done
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  JOIN public.modules m ON m.id = l.module_id
  WHERE m.course_id = v_course AND lp.user_id = v_user AND lp.is_completed = true;

  v_pct := CASE WHEN v_total = 0 THEN 0 ELSE round((v_done::numeric / v_total) * 100, 2) END;

  UPDATE public.enrollments
     SET progress_percentage = v_pct,
         is_completed = (v_total > 0 AND v_done >= v_total),
         updated_at = now()
   WHERE user_id = v_user AND course_id = v_course;

  RETURN COALESCE(NEW, OLD);
END$$;

DROP TRIGGER IF EXISTS trg_recompute_progress ON public.lesson_progress;
CREATE TRIGGER trg_recompute_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.recompute_enrollment_progress();

-- Make sure certificate-on-completion trigger is attached
DROP TRIGGER IF EXISTS trg_issue_certificate ON public.enrollments;
CREATE TRIGGER trg_issue_certificate
  AFTER UPDATE OF is_completed ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.issue_certificate_on_completion();
