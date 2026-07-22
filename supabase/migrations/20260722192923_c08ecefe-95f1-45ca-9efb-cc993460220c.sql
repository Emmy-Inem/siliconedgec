
-- 1. Enrollments: restrict admin ALL to authenticated + add trigger validating student-editable fields
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage enrollments" ON public.enrollments
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));

CREATE OR REPLACE FUNCTION public.enforce_enrollment_student_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Service role and staff bypass
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;
  IF public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN
    RETURN NEW;
  END IF;

  -- Students may only touch progress-related fields on their own row
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.course_id IS DISTINCT FROM OLD.course_id
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.access_source IS DISTINCT FROM OLD.access_source
     OR NEW.granted_by IS DISTINCT FROM OLD.granted_by
     OR NEW.is_completed IS DISTINCT FROM OLD.is_completed THEN
    RAISE EXCEPTION 'Only progress fields can be updated by students'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Sanity clamps
  IF NEW.progress_percentage IS NOT NULL AND (NEW.progress_percentage < 0 OR NEW.progress_percentage > 100) THEN
    RAISE EXCEPTION 'progress_percentage out of range' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.resume_position_seconds IS NOT NULL AND NEW.resume_position_seconds < 0 THEN
    RAISE EXCEPTION 'resume_position_seconds cannot be negative' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_enrollment_student_update_scope ON public.enrollments;
CREATE TRIGGER trg_enforce_enrollment_student_update_scope
BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.enforce_enrollment_student_update_scope();

-- 2. Influencer referrals: scope admin policy to authenticated + explicit WITH CHECK
DROP POLICY IF EXISTS "Admins can manage referrals" ON public.influencer_referrals;
CREATE POLICY "Admins can manage referrals" ON public.influencer_referrals
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 3. Lessons: require platform-level instructor role for INSERT (not just cohort membership)
DROP POLICY IF EXISTS "instructors can create lessons in their modules" ON public.lessons;
CREATE POLICY "instructors can create lessons in their modules" ON public.lessons
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'instructor'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.modules m
      JOIN public.cohorts c ON c.course_id = m.course_id
      JOIN public.cohort_members cm ON cm.cohort_id = c.id
      WHERE m.id = lessons.module_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'instructor'
    )
  );
