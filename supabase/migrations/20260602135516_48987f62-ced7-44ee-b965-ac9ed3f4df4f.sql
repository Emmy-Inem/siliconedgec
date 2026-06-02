
-- Restrict lesson/quiz/assignment access to admins + paid enrollments only.
-- Webinar (free) and comped registrants will NOT have access.

-- Helper function: is the current user a paid enrollee on the given course?
CREATE OR REPLACE FUNCTION public.is_paid_enrolled(_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = _course_id
      AND e.user_id = auth.uid()
      AND COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed')
  );
$$;

-- LESSONS: lock content access to admin or paid enrollment
DROP POLICY IF EXISTS "Lessons viewable by everyone" ON public.lessons;
DROP POLICY IF EXISTS "Lessons viewable by enrolled or admin" ON public.lessons;
CREATE POLICY "Lessons viewable by enrolled or admin"
ON public.lessons
FOR SELECT
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'moderator'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = lessons.module_id
      AND public.is_paid_enrolled(m.course_id)
  )
);

-- ASSIGNMENTS: tighten existing policy (remove 'free','comped')
DROP POLICY IF EXISTS "enrolled or admin reads assignments" ON public.assignments;
CREATE POLICY "enrolled or admin reads assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'moderator'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = assignments.lesson_id
      AND public.is_paid_enrolled(m.course_id)
  )
);

-- LESSON RESOURCES: tighten
DROP POLICY IF EXISTS "Enrolled users can view lesson resources" ON public.lesson_resources;
CREATE POLICY "Paid enrolled or admin view lesson resources"
ON public.lesson_resources
FOR SELECT
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'moderator'::app_role)
  OR public.is_paid_enrolled(course_id)
);

-- LESSON TRANSCRIPTS: tighten
DROP POLICY IF EXISTS "enrolled or admin reads transcript" ON public.lesson_transcripts;
CREATE POLICY "paid enrolled or admin reads transcript"
ON public.lesson_transcripts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'moderator'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = lesson_transcripts.lesson_id
      AND public.is_paid_enrolled(m.course_id)
  )
);

-- QUIZZES: lock to admin + paid enrollment
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quizzes viewable by everyone" ON public.quizzes;
DROP POLICY IF EXISTS "Admins manage quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Paid enrolled or admin read quizzes" ON public.quizzes;
CREATE POLICY "Admins manage quizzes"
ON public.quizzes FOR ALL
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "Paid enrolled or admin read quizzes"
ON public.quizzes FOR SELECT
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'moderator'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = quizzes.lesson_id
      AND public.is_paid_enrolled(m.course_id)
  )
);

-- QUIZ QUESTIONS: lock to admin + paid enrollment
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quiz questions viewable by everyone" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admins manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Paid enrolled or admin read quiz questions" ON public.quiz_questions;
CREATE POLICY "Admins manage quiz questions"
ON public.quiz_questions FOR ALL
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "Paid enrolled or admin read quiz questions"
ON public.quiz_questions FOR SELECT
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'moderator'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    WHERE q.id = quiz_questions.quiz_id
      AND public.is_paid_enrolled(m.course_id)
  )
);
