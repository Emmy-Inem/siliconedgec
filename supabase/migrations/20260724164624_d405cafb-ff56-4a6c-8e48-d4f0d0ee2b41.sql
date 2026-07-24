SET session_replication_role = 'replica';

INSERT INTO public.cohort_members (cohort_id, user_id, role)
SELECT DISTINCT co.id, e.user_id, 'member'
FROM public.enrollments e
JOIN public.courses c ON c.id = e.course_id AND c.cohort_only = true
JOIN public.cohorts co ON co.course_id = c.id
WHERE e.user_id IS NOT NULL
  AND (
    COALESCE(e.payment_status,'') IN ('paid','success','completed','confirmed','granted','comped')
    OR COALESCE(e.access_source,'') IN ('manual_grant','promo','bootcamp')
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.cohort_members (cohort_id, user_id, role)
SELECT DISTINCT co.id, be.user_id, 'member'
FROM public.bootcamp_enrollments be
JOIN public.bootcamp_cohorts bc ON bc.id = be.cohort_id
JOIN public.cohorts co ON co.course_id = bc.course_id
WHERE be.user_id IS NOT NULL
  AND (be.access_granted = true OR be.status IN ('granted','paid','completed','active'))
ON CONFLICT DO NOTHING;

INSERT INTO public.enrollments (user_id, course_id, payment_status, access_source, progress_percentage, is_completed)
SELECT DISTINCT be.user_id, bc.course_id, 'granted', 'bootcamp', 0, false
FROM public.bootcamp_enrollments be
JOIN public.bootcamp_cohorts bc ON bc.id = be.cohort_id
WHERE be.user_id IS NOT NULL
  AND bc.course_id IS NOT NULL
  AND (be.access_granted = true OR be.status IN ('granted','paid','completed','active'))
ON CONFLICT (user_id, course_id) DO NOTHING;

SET session_replication_role = 'origin';

CREATE OR REPLACE FUNCTION public.sync_bootcamp_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid;
  v_cohort uuid;
  v_prev_role text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NOT (NEW.access_granted = true OR NEW.status IN ('granted','paid','completed','active')) THEN
    RETURN NEW;
  END IF;

  SELECT course_id INTO v_course FROM public.bootcamp_cohorts WHERE id = NEW.cohort_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;

  -- Bypass prevent_self_paid_enrollment: this is a trusted staff-side sync.
  v_prev_role := current_setting('role', true);
  PERFORM set_config('role', 'service_role', true);

  INSERT INTO public.enrollments (user_id, course_id, payment_status, access_source, progress_percentage, is_completed)
  VALUES (NEW.user_id, v_course, 'granted', 'bootcamp', 0, false)
  ON CONFLICT (user_id, course_id) DO NOTHING;

  IF v_prev_role IS NOT NULL THEN
    PERFORM set_config('role', v_prev_role, true);
  END IF;

  SELECT id INTO v_cohort FROM public.cohorts WHERE course_id = v_course ORDER BY start_date NULLS LAST, id LIMIT 1;
  IF v_cohort IS NOT NULL THEN
    INSERT INTO public.cohort_members (cohort_id, user_id, role)
    VALUES (v_cohort, NEW.user_id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bootcamp_access ON public.bootcamp_enrollments;
CREATE TRIGGER trg_sync_bootcamp_access
AFTER INSERT OR UPDATE OF access_granted, status, user_id
ON public.bootcamp_enrollments
FOR EACH ROW EXECUTE FUNCTION public.sync_bootcamp_access();

UPDATE public.courses c
   SET students_enrolled = COALESCE((
     SELECT count(DISTINCT cm.user_id)
     FROM public.cohort_members cm
     JOIN public.cohorts co ON co.id = cm.cohort_id
     WHERE co.course_id = c.id
   ), 0)
 WHERE c.cohort_only = true;

DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage enrollments"
  ON public.enrollments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Staff can view enrollments" ON public.enrollments;
CREATE POLICY "Staff can view enrollments"
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role,'support'::app_role,'finance'::app_role]));