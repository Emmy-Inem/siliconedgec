
-- 1. Cohort-only flag
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cohort_only boolean NOT NULL DEFAULT false;

UPDATE public.courses SET cohort_only = true
 WHERE id = '3b1f29ec-8fd4-4ff0-9357-1987b90e6c91';

-- 2. Access helper honoring cohort_only
CREATE OR REPLACE FUNCTION public.user_can_access_course(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _user_id IS NULL THEN false
      WHEN public.has_any_role(_user_id, ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.cohort_only = true
      ) THEN EXISTS (
        SELECT 1 FROM public.cohort_members cm
        JOIN public.cohorts co ON co.id = cm.cohort_id
        WHERE co.course_id = _course_id AND cm.user_id = _user_id
      )
      ELSE EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.course_id = _course_id AND e.user_id = _user_id
          AND (
            COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed','granted')
            OR e.access_source IN ('manual_grant','promo','bootcamp')
          )
      )
    END;
$$;

-- 3. Tighten existing paid-enrolled checks to honor cohort_only
CREATE OR REPLACE FUNCTION public.is_paid_enrolled(_course_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.user_can_access_course(_course_id, auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_paid_enrolled_for_lesson(_lesson_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = _lesson_id
      AND public.user_can_access_course(m.course_id, auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_paid_enrolled_for_assignment(_assignment_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.lessons l ON l.id = a.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    WHERE a.id = _assignment_id
      AND public.user_can_access_course(m.course_id, auth.uid())
  );
$$;

-- 4. Student-facing reveal for hidden AI-generated practice quizzes
CREATE OR REPLACE FUNCTION public.reveal_ai_quiz_for_lesson(_lesson_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_quiz uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.is_paid_enrolled_for_lesson(_lesson_id) THEN
    RAISE EXCEPTION 'not enrolled' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE public.quizzes
     SET is_visible = true
   WHERE lesson_id = _lesson_id AND is_ai_generated = true AND is_visible = false
   RETURNING id INTO v_quiz;
  IF v_quiz IS NULL THEN
    SELECT id INTO v_quiz FROM public.quizzes WHERE lesson_id = _lesson_id AND is_visible = true LIMIT 1;
  END IF;
  RETURN v_quiz;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_course(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.reveal_ai_quiz_for_lesson(uuid) TO authenticated;
