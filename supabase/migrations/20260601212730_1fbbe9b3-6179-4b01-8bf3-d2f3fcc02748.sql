ALTER TABLE public.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_payment_status_check;

ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'refunded', 'free', 'comped', 'confirmed', 'success'));

CREATE OR REPLACE FUNCTION public.auto_enroll_on_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.course_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.enrollments (user_id, course_id, payment_status, progress_percentage, is_completed)
  VALUES (
    NEW.user_id,
    NEW.course_id,
    CASE WHEN NEW.registration_type = 'webinar' THEN 'free' ELSE 'comped' END,
    0,
    false
  )
  ON CONFLICT (user_id, course_id)
  DO UPDATE SET
    payment_status = CASE
      WHEN public.enrollments.payment_status IN ('paid', 'success') THEN public.enrollments.payment_status
      WHEN EXCLUDED.payment_status = 'free' THEN 'free'
      ELSE COALESCE(public.enrollments.payment_status, EXCLUDED.payment_status)
    END,
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage enrollments"
ON public.enrollments
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can manage registrations" ON public.course_registrations;
CREATE POLICY "Admins can manage registrations"
ON public.course_registrations
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can manage live classes" ON public.live_classes;
CREATE POLICY "Admins can manage live classes"
ON public.live_classes
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Enrolled users can view live classes" ON public.live_classes;
DROP POLICY IF EXISTS "Enrolled users or admins can view live classes" ON public.live_classes;
CREATE POLICY "Enrolled users or admins can view live classes"
ON public.live_classes
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.course_id = live_classes.course_id
      AND e.user_id = auth.uid()
      AND COALESCE(e.payment_status, 'pending') IN ('paid', 'success', 'confirmed', 'free', 'comped')
  )
);

DROP POLICY IF EXISTS "Admins can manage lesson resources" ON public.lesson_resources;
CREATE POLICY "Admins can manage lesson resources"
ON public.lesson_resources
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Enrolled users can view lesson resources" ON public.lesson_resources;
CREATE POLICY "Enrolled users can view lesson resources"
ON public.lesson_resources
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.course_id = lesson_resources.course_id
      AND e.user_id = auth.uid()
      AND COALESCE(e.payment_status, 'pending') IN ('paid', 'success', 'confirmed', 'free', 'comped')
  )
);

DROP POLICY IF EXISTS "admin writes transcript" ON public.lesson_transcripts;
CREATE POLICY "admin writes transcript"
ON public.lesson_transcripts
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "enrolled or admin reads transcript" ON public.lesson_transcripts;
CREATE POLICY "enrolled or admin reads transcript"
ON public.lesson_transcripts
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE l.id = lesson_transcripts.lesson_id
      AND e.user_id = auth.uid()
      AND COALESCE(e.payment_status, 'pending') IN ('paid', 'success', 'confirmed', 'free', 'comped')
  )
);

DROP POLICY IF EXISTS "admin writes assignments" ON public.assignments;
CREATE POLICY "admin writes assignments"
ON public.assignments
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "enrolled or admin reads assignments" ON public.assignments;
CREATE POLICY "enrolled or admin reads assignments"
ON public.assignments
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE l.id = assignments.lesson_id
      AND e.user_id = auth.uid()
      AND COALESCE(e.payment_status, 'pending') IN ('paid', 'success', 'confirmed', 'free', 'comped')
  )
);

DROP POLICY IF EXISTS "own submissions read" ON public.assignment_submissions;
CREATE POLICY "own submissions read"
ON public.assignment_submissions
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "own submissions update" ON public.assignment_submissions;
CREATE POLICY "own submissions update"
ON public.assignment_submissions
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;
CREATE POLICY "Admins can manage quizzes"
ON public.quizzes
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can manage quiz questions" ON public.quiz_questions;
CREATE POLICY "Admins can manage quiz questions"
ON public.quiz_questions
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view own quiz attempts"
ON public.quiz_attempts
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can manage quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Admins can manage quiz attempts"
ON public.quiz_attempts
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules"
ON public.modules
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons"
ON public.lessons
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

UPDATE public.enrollments
SET payment_status = 'free',
    updated_at = now()
WHERE payment_status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.course_registrations r
    WHERE r.user_id = enrollments.user_id
      AND r.course_id = enrollments.course_id
      AND r.registration_type = 'webinar'
  );