-- 1. Lock access_expires_at (and existing fields) for student self-updates on enrollments
CREATE OR REPLACE FUNCTION public.enforce_enrollment_student_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;
  IF public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.course_id IS DISTINCT FROM OLD.course_id
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.access_source IS DISTINCT FROM OLD.access_source
     OR NEW.granted_by IS DISTINCT FROM OLD.granted_by
     OR NEW.access_expires_at IS DISTINCT FROM OLD.access_expires_at
     OR NEW.is_completed IS DISTINCT FROM OLD.is_completed THEN
    RAISE EXCEPTION 'Only progress fields can be updated by students'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.progress_percentage IS NOT NULL AND (NEW.progress_percentage < 0 OR NEW.progress_percentage > 100) THEN
    RAISE EXCEPTION 'progress_percentage out of range' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.resume_position_seconds IS NOT NULL AND NEW.resume_position_seconds < 0 THEN
    RAISE EXCEPTION 'resume_position_seconds cannot be negative' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Also enforce immutability directly in the RLS policy (defence in depth)
DROP POLICY IF EXISTS "Users can update own progress fields" ON public.enrollments;
CREATE POLICY "Users can update own progress fields"
ON public.enrollments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND NOT (payment_status IS DISTINCT FROM (SELECT e2.payment_status FROM public.enrollments e2 WHERE e2.id = enrollments.id))
  AND NOT (course_id IS DISTINCT FROM (SELECT e2.course_id FROM public.enrollments e2 WHERE e2.id = enrollments.id))
  AND NOT (user_id IS DISTINCT FROM (SELECT e2.user_id FROM public.enrollments e2 WHERE e2.id = enrollments.id))
  AND NOT (access_source IS DISTINCT FROM (SELECT e2.access_source FROM public.enrollments e2 WHERE e2.id = enrollments.id))
  AND NOT (granted_by IS DISTINCT FROM (SELECT e2.granted_by FROM public.enrollments e2 WHERE e2.id = enrollments.id))
  AND NOT (access_expires_at IS DISTINCT FROM (SELECT e2.access_expires_at FROM public.enrollments e2 WHERE e2.id = enrollments.id))
);

-- 2. RSVP: enforce attendance-field immutability in the policy itself, not only the trigger
DROP POLICY IF EXISTS "cohort_rsvp_self_update_status_only" ON public.cohort_session_rsvps;
CREATE POLICY "cohort_rsvp_self_update_status_only"
ON public.cohort_session_rsvps
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND NOT (session_id IS DISTINCT FROM (SELECT r2.session_id FROM public.cohort_session_rsvps r2 WHERE r2.id = cohort_session_rsvps.id))
  AND NOT (attended IS DISTINCT FROM (SELECT r2.attended FROM public.cohort_session_rsvps r2 WHERE r2.id = cohort_session_rsvps.id))
  AND NOT (marked_by IS DISTINCT FROM (SELECT r2.marked_by FROM public.cohort_session_rsvps r2 WHERE r2.id = cohort_session_rsvps.id))
  AND NOT (marked_at IS DISTINCT FROM (SELECT r2.marked_at FROM public.cohort_session_rsvps r2 WHERE r2.id = cohort_session_rsvps.id))
);

-- Ensure the protective trigger is present exactly once and active
DROP TRIGGER IF EXISTS trg_protect_rsvp ON public.cohort_session_rsvps;
DROP TRIGGER IF EXISTS trg_protect_rsvp_attendance_fields ON public.cohort_session_rsvps;
CREATE TRIGGER trg_protect_rsvp_attendance_fields
BEFORE UPDATE ON public.cohort_session_rsvps
FOR EACH ROW EXECUTE FUNCTION public.protect_rsvp_attendance_fields();