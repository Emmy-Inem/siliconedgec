
CREATE OR REPLACE FUNCTION public.is_paid_enrolled_for_lesson(_lesson_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE l.id = _lesson_id
      AND e.user_id = auth.uid()
      AND COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed','free','comped')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_paid_enrolled_for_assignment(_assignment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    JOIN public.lessons l ON l.id = a.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE a.id = _assignment_id
      AND e.user_id = auth.uid()
      AND COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed','free','comped')
  );
$$;

DROP POLICY IF EXISTS "Users can manage own progress" ON public.lesson_progress;

CREATE POLICY "lesson_progress select own" ON public.lesson_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));

CREATE POLICY "lesson_progress insert enrolled" ON public.lesson_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      public.is_paid_enrolled_for_lesson(lesson_id)
      OR has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'moderator'::app_role)
    )
  );

CREATE POLICY "lesson_progress update enrolled" ON public.lesson_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role))
  WITH CHECK (
    auth.uid() = user_id AND (
      public.is_paid_enrolled_for_lesson(lesson_id)
      OR has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'moderator'::app_role)
    )
  );

CREATE POLICY "lesson_progress delete own" ON public.lesson_progress
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));

DROP POLICY IF EXISTS "own submissions write" ON public.assignment_submissions;

CREATE POLICY "own submissions write" ON public.assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      public.is_paid_enrolled_for_assignment(assignment_id)
      OR has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'moderator'::app_role)
    )
  );
