-- ============================================================================
-- Migration: 20260912190000_defense_in_depth_catalog_and_rsvps.sql
-- 1. role_permissions: restrict SELECT strictly to staff (admin, moderator, instructor)
-- 2. Catalog tables: defense-in-depth BEFORE trigger preventing non-staff mutation
-- 3. cohort_session_rsvps: prevent learners from self-marking attendance on INSERT
-- ============================================================================

-- 1. role_permissions hardening
REVOKE ALL ON public.role_permissions FROM anon, public;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

DROP POLICY IF EXISTS "Anyone authed reads role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins and moderators read role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Staff read role permissions" ON public.role_permissions;

CREATE POLICY "Staff read role permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role, 'instructor'::app_role]));

-- 2. Catalog defense-in-depth triggers (courses, pricing_plans, categories)
REVOKE INSERT, UPDATE, DELETE ON TABLE public.courses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.categories FROM anon;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pricing_plans') THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON TABLE public.pricing_plans FROM anon';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_catalog_modification_protection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  is_staff boolean;
  caller_role text;
BEGIN
  -- Service role and direct postgres migrations bypass
  BEGIN
    caller_role := current_setting('role', true);
  EXCEPTION WHEN OTHERS THEN
    caller_role := '';
  END;

  IF caller_role = 'service_role' OR current_user = 'postgres' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF auth.role() = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Require admin or instructor role
  is_staff := public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'instructor'::app_role]);
  IF NOT is_staff THEN
    RAISE EXCEPTION 'Catalog modification denied: staff privileges required'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_catalog_protect_courses ON public.courses;
CREATE TRIGGER trg_catalog_protect_courses
  BEFORE INSERT OR UPDATE OR DELETE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_catalog_modification_protection();

DROP TRIGGER IF EXISTS trg_catalog_protect_categories ON public.categories;
CREATE TRIGGER trg_catalog_protect_categories
  BEFORE INSERT OR UPDATE OR DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_catalog_modification_protection();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pricing_plans') THEN
    DROP TRIGGER IF EXISTS trg_catalog_protect_pricing_plans ON public.pricing_plans;
    CREATE TRIGGER trg_catalog_protect_pricing_plans
      BEFORE INSERT OR UPDATE OR DELETE ON public.pricing_plans
      FOR EACH ROW EXECUTE FUNCTION public.enforce_catalog_modification_protection();
  END IF;
END $$;

-- 3. cohort_session_rsvps self-marking attendance prevention
-- Enforce on INSERT policy
DROP POLICY IF EXISTS cohort_rsvp_self_insert ON public.cohort_session_rsvps;
CREATE POLICY cohort_rsvp_self_insert ON public.cohort_session_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (attended IS NULL OR attended = false)
    AND marked_by IS NULL
    AND marked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.cohort_sessions cs
      WHERE cs.id = session_id AND public.is_cohort_member(cs.cohort_id, auth.uid())
    )
  );

-- Update protective trigger to guard both INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.protect_rsvp_attendance_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_staff boolean;
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  is_staff := public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]);

  IF is_staff THEN
    RETURN NEW;
  END IF;

  -- Non-staff on INSERT cannot mark themselves as attended
  IF TG_OP = 'INSERT' THEN
    NEW.attended  := false;
    NEW.marked_at := null;
    NEW.marked_by := null;
    RETURN NEW;
  END IF;

  -- Non-staff on UPDATE may only change their own RSVP status; attendance fields are locked.
  NEW.attended  := OLD.attended;
  NEW.marked_at := OLD.marked_at;
  NEW.marked_by := OLD.marked_by;
  NEW.user_id   := OLD.user_id;
  NEW.session_id := OLD.session_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_rsvp_attendance_fields ON public.cohort_session_rsvps;
CREATE TRIGGER trg_protect_rsvp_attendance_fields
  BEFORE INSERT OR UPDATE ON public.cohort_session_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.protect_rsvp_attendance_fields();
