
-- 1) Prevent students from tampering with grading fields on their own submissions.
DROP POLICY IF EXISTS "own submissions update" ON public.assignment_submissions;

CREATE POLICY "Students update own ungraded submissions"
ON public.assignment_submissions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND grade IS NULL)
WITH CHECK (auth.uid() = user_id AND grade IS NULL);

CREATE POLICY "Staff update any submission"
ON public.assignment_submissions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));

-- Defense in depth: trigger blocks non-staff from ever writing grading fields.
CREATE OR REPLACE FUNCTION public.protect_submission_grading_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;
  IF has_role(auth.uid(),'admin'::app_role)
     OR has_role(auth.uid(),'moderator'::app_role)
     OR instructor_teaches_lesson(
          (SELECT lesson_id FROM public.assignments WHERE id = NEW.assignment_id),
          auth.uid()
        )
  THEN
    RETURN NEW;
  END IF;

  IF NEW.grade      IS DISTINCT FROM OLD.grade
     OR NEW.feedback   IS DISTINCT FROM OLD.feedback
     OR NEW.graded_by  IS DISTINCT FROM OLD.graded_by
     OR NEW.graded_at  IS DISTINCT FROM OLD.graded_at
  THEN
    RAISE EXCEPTION 'Grade, feedback, graded_by and graded_at can only be set by instructors or admins.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_submission_grading_fields ON public.assignment_submissions;
CREATE TRIGGER trg_protect_submission_grading_fields
BEFORE UPDATE ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.protect_submission_grading_fields();

-- 2) Restrict cohort_session_rsvps self-update to the `status` column only.
DROP POLICY IF EXISTS cohort_rsvp_self_update ON public.cohort_session_rsvps;

CREATE POLICY cohort_rsvp_self_update_status_only
ON public.cohort_session_rsvps FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_rsvp_attendance_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_cohort uuid;
BEGIN
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;
  SELECT cohort_id INTO v_cohort FROM public.cohort_sessions WHERE id = NEW.session_id;
  IF has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role])
     OR (v_cohort IS NOT NULL AND is_cohort_instructor(v_cohort, auth.uid()))
  THEN
    RETURN NEW;
  END IF;
  IF NEW.attended  IS DISTINCT FROM OLD.attended
     OR NEW.marked_at IS DISTINCT FROM OLD.marked_at
     OR NEW.marked_by IS DISTINCT FROM OLD.marked_by
  THEN
    RAISE EXCEPTION 'Attendance can only be recorded by instructors or staff.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_rsvp_attendance_fields ON public.cohort_session_rsvps;
CREATE TRIGGER trg_protect_rsvp_attendance_fields
BEFORE UPDATE ON public.cohort_session_rsvps
FOR EACH ROW EXECUTE FUNCTION public.protect_rsvp_attendance_fields();

-- 3) Data fixes.
-- Strip the "(+ Assignment)" suffix from lesson titles — the UI shows a glow dot instead.
UPDATE public.lessons
   SET title = btrim(regexp_replace(title, '\s*\(\+\s*Assignment\)\s*$', '', 'i'))
 WHERE title ~* '\(\+\s*Assignment\)\s*$';

-- Mark Fauziyah Zakariyah as the lead instructor for the Azure Bootcamp cohort
-- so she wins over Tayo Ayodele on the course detail page.
UPDATE public.cohort_members
   SET is_lead = true
 WHERE cohort_id = 'ff5a3dca-0815-42d2-8203-41b37966fc11'
   AND user_id  = '79127a15-f3cf-4da1-9a39-af98bfb67baf';

UPDATE public.cohort_members
   SET is_lead = false
 WHERE cohort_id = 'ff5a3dca-0815-42d2-8203-41b37966fc11'
   AND user_id  = '33b0e2fd-0d9b-43e7-992c-073f36884a69';
