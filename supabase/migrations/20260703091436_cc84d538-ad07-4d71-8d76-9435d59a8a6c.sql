
CREATE OR REPLACE FUNCTION public.is_cohort_instructor(_cohort_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cohort_members
    WHERE cohort_id = _cohort_id AND user_id = _user_id AND role = 'instructor'
  )
$$;

CREATE OR REPLACE FUNCTION public.instructor_teaches_lesson(_lesson_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m  ON m.id = l.module_id
    JOIN public.cohorts c  ON c.course_id = m.course_id
    JOIN public.cohort_members cm ON cm.cohort_id = c.id
    WHERE l.id = _lesson_id AND cm.user_id = _user_id AND cm.role = 'instructor'
  )
$$;

CREATE OR REPLACE FUNCTION public.instructor_teaches_course(_course_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cohorts c
    JOIN public.cohort_members cm ON cm.cohort_id = c.id
    WHERE c.course_id = _course_id AND cm.user_id = _user_id AND cm.role = 'instructor'
  )
$$;

DROP POLICY IF EXISTS "Instructors read cohort submissions" ON public.assignment_submissions;
CREATE POLICY "Instructors read cohort submissions"
ON public.assignment_submissions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_submissions.assignment_id
      AND public.instructor_teaches_lesson(a.lesson_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Instructors grade cohort submissions" ON public.assignment_submissions;
CREATE POLICY "Instructors grade cohort submissions"
ON public.assignment_submissions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_submissions.assignment_id
      AND public.instructor_teaches_lesson(a.lesson_id, auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_submissions.assignment_id
      AND public.instructor_teaches_lesson(a.lesson_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Instructors read cohort quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Instructors read cohort quiz attempts"
ON public.quiz_attempts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_attempts.quiz_id
      AND q.lesson_id IS NOT NULL
      AND public.instructor_teaches_lesson(q.lesson_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Instructors read cohort lesson progress" ON public.lesson_progress;
CREATE POLICY "Instructors read cohort lesson progress"
ON public.lesson_progress FOR SELECT TO authenticated
USING (public.instructor_teaches_lesson(lesson_progress.lesson_id, auth.uid()));
