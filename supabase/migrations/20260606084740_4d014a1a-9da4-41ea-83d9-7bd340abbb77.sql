
-- 1) live_classes SELECT policy — paid enrollees & admins only
DROP POLICY IF EXISTS "Enrolled users or admins can view live classes" ON public.live_classes;
CREATE POLICY "Paid enrollees or admins can view live classes"
  ON public.live_classes FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
    OR public.is_paid_enrolled(course_id)
  );

-- 2) enrollments UPDATE — block self-update of payment_status & related
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.enrollments;
CREATE POLICY "Users can update own progress fields"
  ON public.enrollments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND payment_status IS NOT DISTINCT FROM (
      SELECT e2.payment_status FROM public.enrollments e2 WHERE e2.id = enrollments.id
    )
    AND course_id IS NOT DISTINCT FROM (
      SELECT e2.course_id FROM public.enrollments e2 WHERE e2.id = enrollments.id
    )
    AND user_id IS NOT DISTINCT FROM (
      SELECT e2.user_id FROM public.enrollments e2 WHERE e2.id = enrollments.id
    )
  );

-- 3) admin_activity_log INSERT — admins/moderators only
DROP POLICY IF EXISTS "Admins/mods can insert activity log" ON public.admin_activity_log;
CREATE POLICY "Admins/mods can insert activity log"
  ON public.admin_activity_log FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );

-- 4) Quiz retake limits
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS max_attempts integer;

CREATE OR REPLACE FUNCTION public.grade_quiz_submission(p_quiz_id uuid, p_answers jsonb)
 RETURNS TABLE(score integer, passed boolean, passing_score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_total int;
  v_correct int := 0;
  v_score int := 0;
  v_pass int;
  v_max int;
  v_attempts int;
  v_passed boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT q.passing_score, q.max_attempts INTO v_pass, v_max
    FROM public.quizzes q WHERE q.id = p_quiz_id;
  IF v_pass IS NULL THEN RAISE EXCEPTION 'quiz not found'; END IF;

  IF v_max IS NOT NULL THEN
    SELECT count(*) INTO v_attempts FROM public.quiz_attempts
      WHERE user_id = v_user AND quiz_id = p_quiz_id;
    -- Once a user has passed, allow continued review attempts (don't block).
    IF v_attempts >= v_max AND NOT EXISTS (
        SELECT 1 FROM public.quiz_attempts
         WHERE user_id = v_user AND quiz_id = p_quiz_id AND score >= v_pass
    ) THEN
      RAISE EXCEPTION 'Maximum attempts (%) reached for this quiz.', v_max
        USING ERRCODE = 'check_violation';
    END IF;
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
$function$;

-- 5) Assignment notifications
CREATE OR REPLACE FUNCTION public.notify_assignment_submission()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_title text; v_admin uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT title INTO v_title FROM public.assignments WHERE id = NEW.assignment_id;
    -- Notify admins/moderators
    FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','moderator') LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (v_admin, 'New assignment submission',
              'A learner submitted: ' || COALESCE(v_title,'an assignment'),
              'info', '/admin/assessments');
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND NEW.grade IS NOT NULL
        AND (OLD.grade IS DISTINCT FROM NEW.grade) THEN
    SELECT title INTO v_title FROM public.assignments WHERE id = NEW.assignment_id;
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id, 'Assignment graded',
            'Your submission for "' || COALESCE(v_title,'an assignment') ||
            '" was graded: ' || NEW.grade::text || ' pts.',
            'success', '/dashboard');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_assignment_submission_notify ON public.assignment_submissions;
CREATE TRIGGER trg_assignment_submission_notify
AFTER INSERT OR UPDATE ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_submission();
