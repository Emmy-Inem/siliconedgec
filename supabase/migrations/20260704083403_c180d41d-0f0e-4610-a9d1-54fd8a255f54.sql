
-- =========================================================================
-- 1. user_favorites
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.user_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_favorites TO service_role;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own favorites" ON public.user_favorites;
CREATE POLICY "own favorites" ON public.user_favorites
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =========================================================================
-- 2. enrollments.access_source / granted_by
-- =========================================================================
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS access_source text NOT NULL DEFAULT 'payment',
  ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES auth.users(id);

-- Bypass the anti-self-paid trigger for admin/instructor grants (already handles admin/moderator).
CREATE OR REPLACE FUNCTION public.prevent_self_paid_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  paid_statuses CONSTANT text[] := ARRAY['paid','success','completed','confirmed'];
BEGIN
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;
  IF public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_status = ANY(paid_statuses)
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    RAISE EXCEPTION 'Payment status can only be set by the payment service.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.payment_status = 'granted'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    RAISE EXCEPTION 'Granted access can only be assigned by staff.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END; $$;

-- is_paid_enrolled — now also honors 'granted' and manual/promo/bootcamp access_source.
CREATE OR REPLACE FUNCTION public.is_paid_enrolled(_course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = _course_id
      AND e.user_id = auth.uid()
      AND (
        COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed','granted')
        OR e.access_source IN ('manual_grant','promo','bootcamp')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_paid_enrolled_for_lesson(_lesson_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE l.id = _lesson_id
      AND e.user_id = auth.uid()
      AND (
        COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed','granted')
        OR e.access_source IN ('manual_grant','promo','bootcamp')
      )
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
      AND (
        COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed','granted')
        OR e.access_source IN ('manual_grant','promo','bootcamp')
      )
  );
$$;

-- =========================================================================
-- 3. quizzes.is_ai_generated / is_visible
-- =========================================================================
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS is_ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

-- =========================================================================
-- 4. cohort_members.is_lead
-- =========================================================================
ALTER TABLE public.cohort_members
  ADD COLUMN IF NOT EXISTS is_lead boolean NOT NULL DEFAULT false;

-- =========================================================================
-- 5. get_course_instructors(course_id)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_course_instructors(p_course_id uuid)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, is_lead boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (cm.user_id)
         cm.user_id,
         p.full_name,
         p.avatar_url,
         bool_or(cm.is_lead) OVER (PARTITION BY cm.user_id) AS is_lead
  FROM public.cohorts c
  JOIN public.cohort_members cm ON cm.cohort_id = c.id
  LEFT JOIN public.profiles p ON p.user_id = cm.user_id
  WHERE c.course_id = p_course_id
    AND cm.role = 'instructor'
  ORDER BY cm.user_id, cm.is_lead DESC NULLS LAST;
$$;

-- =========================================================================
-- 6. Instructor RLS on quizzes / quiz_questions / assignments
-- =========================================================================
DROP POLICY IF EXISTS "instructors manage cohort quizzes" ON public.quizzes;
CREATE POLICY "instructors manage cohort quizzes" ON public.quizzes
  FOR ALL TO authenticated
  USING (public.instructor_teaches_lesson(lesson_id, auth.uid()))
  WITH CHECK (public.instructor_teaches_lesson(lesson_id, auth.uid()));

DROP POLICY IF EXISTS "instructors manage cohort quiz questions" ON public.quiz_questions;
CREATE POLICY "instructors manage cohort quiz questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND public.instructor_teaches_lesson(q.lesson_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND public.instructor_teaches_lesson(q.lesson_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "instructors manage cohort assignments" ON public.assignments;
CREATE POLICY "instructors manage cohort assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (public.instructor_teaches_lesson(lesson_id, auth.uid()))
  WITH CHECK (public.instructor_teaches_lesson(lesson_id, auth.uid()));

-- =========================================================================
-- 7. Seed role_permissions for instructor
-- =========================================================================
INSERT INTO public.role_permissions (role, route, allowed) VALUES
  ('instructor','/admin',true),
  ('instructor','/admin/cohorts',true),
  ('instructor','/admin/courses',true),
  ('instructor','/admin/courses/new',true),
  ('instructor','/admin/modules',true),
  ('instructor','/admin/quizzes',true),
  ('instructor','/admin/quiz-attempts',true),
  ('instructor','/admin/assignments',true),
  ('instructor','/admin/assessments',true),
  ('instructor','/admin/students',true),
  ('instructor','/admin/live-classes',true),
  ('instructor','/admin/announcements',true),
  ('instructor','/admin/qna',true),
  ('instructor','/admin/lesson-approvals',true),
  ('instructor','/admin/content-hub',true),
  ('instructor','/admin/people',true),
  ('instructor','/admin/categories',true),
  ('instructor','/admin/tags',true),
  ('instructor','/admin/paths',true)
ON CONFLICT (role, route) DO UPDATE SET allowed = EXCLUDED.allowed;
