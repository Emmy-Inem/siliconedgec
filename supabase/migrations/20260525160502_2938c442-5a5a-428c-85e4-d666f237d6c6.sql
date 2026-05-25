
-- ============================================================
-- Security hardening migration
-- ============================================================

-- 1. course_announcements: restrict reads to admins or enrolled users
DROP POLICY IF EXISTS "Announcements viewable by everyone" ON public.course_announcements;
CREATE POLICY "Enrolled users or admins can view announcements"
ON public.course_announcements
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = course_announcements.course_id
      AND e.user_id = auth.uid()
  )
);

-- 2. live_classes: stop trusting course_registrations as access proof.
DROP POLICY IF EXISTS "Enrolled or registered users can view live classes" ON public.live_classes;
CREATE POLICY "Enrolled users or admins can view live classes"
ON public.live_classes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = live_classes.course_id
      AND e.user_id = auth.uid()
  )
);

-- 3. course_registrations INSERT: bind user_id to caller when set.
DROP POLICY IF EXISTS "Anyone can submit registrations" ON public.course_registrations;
CREATE POLICY "Visitors can submit registrations"
ON public.course_registrations
FOR INSERT
WITH CHECK (
  length(coalesce(email, '')) > 3
  AND length(coalesce(full_name, '')) > 0
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 4. profiles: restrict raw table to owner + admin; expose a safe view for public display.
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT user_id, full_name, avatar_url
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 5. quiz_questions: hide correct_answer; grade server-side.
DROP POLICY IF EXISTS "Authenticated users can view quiz questions" ON public.quiz_questions;
-- Only admins can read the raw table; learners use the view + RPC.

CREATE OR REPLACE VIEW public.quiz_questions_public
WITH (security_invoker = false) AS
SELECT id, quiz_id, question_text, options, order_index
FROM public.quiz_questions;

GRANT SELECT ON public.quiz_questions_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.grade_quiz_submission(p_quiz_id uuid, p_answers jsonb)
RETURNS TABLE(score integer, passed boolean, passing_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_total int;
  v_correct int := 0;
  v_score int := 0;
  v_pass int;
  v_passed boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  SELECT passing_score INTO v_pass FROM public.quizzes WHERE id = p_quiz_id;
  IF v_pass IS NULL THEN
    RAISE EXCEPTION 'quiz not found';
  END IF;

  SELECT count(*) INTO v_total FROM public.quiz_questions WHERE quiz_id = p_quiz_id;

  IF v_total > 0 THEN
    SELECT count(*) INTO v_correct
    FROM public.quiz_questions q
    WHERE q.quiz_id = p_quiz_id
      AND q.correct_answer IS NOT NULL
      AND (p_answers ->> (q.id::text)) = q.correct_answer;

    v_score := round((v_correct::numeric / v_total) * 100);
  END IF;

  v_passed := v_score >= v_pass;

  INSERT INTO public.quiz_attempts (user_id, quiz_id, score, answers)
  VALUES (v_user, p_quiz_id, v_score, p_answers);

  RETURN QUERY SELECT v_score, v_passed, v_pass;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grade_quiz_submission(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grade_quiz_submission(uuid, jsonb) TO authenticated;

-- 6. user_activity_log: require authenticated insert and bind user_id.
DROP POLICY IF EXISTS "Anyone can insert activity" ON public.user_activity_log;
CREATE POLICY "Authenticated users can insert own activity"
ON public.user_activity_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7. Storage: drop broad listing on public buckets (direct URLs still work).
DROP POLICY IF EXISTS "Authenticated can list course thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can list site media" ON storage.objects;

-- 8. realtime.messages: deny broadcast/presence subscriptions explicitly.
-- The app only relies on postgres_changes, which is governed by table RLS.
DROP POLICY IF EXISTS "Deny realtime broadcast subscriptions" ON realtime.messages;
CREATE POLICY "Deny realtime broadcast subscriptions"
ON realtime.messages
FOR SELECT
TO authenticated, anon
USING (false);
