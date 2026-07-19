
-- 1) Scope the broad "Instructors manage quizzes" policy to only lessons they teach
DROP POLICY IF EXISTS "Instructors manage quizzes" ON public.quizzes;

CREATE POLICY "Instructors manage owned quizzes"
ON public.quizzes
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR (
    public.has_role(auth.uid(), 'instructor')
    AND public.instructor_teaches_lesson(auth.uid(), lesson_id)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR (
    public.has_role(auth.uid(), 'instructor')
    AND public.instructor_teaches_lesson(auth.uid(), lesson_id)
  )
);

-- 2) Prevent students from mutating attendance fields on their own RSVP rows
CREATE OR REPLACE FUNCTION public.protect_rsvp_attendance_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_staff boolean;
BEGIN
  -- Admins, moderators and instructors may set attendance freely
  is_staff := public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'moderator')
           OR public.has_role(auth.uid(), 'instructor');

  IF is_staff THEN
    RETURN NEW;
  END IF;

  -- For everyone else, lock the attendance-related fields to their old values
  IF NEW.attended IS DISTINCT FROM OLD.attended
     OR NEW.marked_at IS DISTINCT FROM OLD.marked_at
     OR NEW.marked_by IS DISTINCT FROM OLD.marked_by THEN
    RAISE EXCEPTION 'Only staff can update attendance fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_rsvp_attendance_fields ON public.cohort_session_rsvps;
CREATE TRIGGER trg_protect_rsvp_attendance_fields
BEFORE UPDATE ON public.cohort_session_rsvps
FOR EACH ROW
EXECUTE FUNCTION public.protect_rsvp_attendance_fields();
