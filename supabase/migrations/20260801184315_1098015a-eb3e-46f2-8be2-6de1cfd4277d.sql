
-- 1. Affiliate landing path + auto referral code
ALTER TABLE public.affiliate_course_selections
  ADD COLUMN IF NOT EXISTS landing_path text;

CREATE OR REPLACE FUNCTION public.set_affiliate_selection_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    SELECT a.code || '-' || substring(replace(gen_random_uuid()::text,'-','') from 1 for 5)
      INTO NEW.referral_code
    FROM public.affiliates a WHERE a.id = NEW.affiliate_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_affiliate_selection_code ON public.affiliate_course_selections;
CREATE TRIGGER trg_set_affiliate_selection_code
BEFORE INSERT ON public.affiliate_course_selections
FOR EACH ROW EXECUTE FUNCTION public.set_affiliate_selection_code();

-- 2. affiliate_clicks: replace always-true insert policy
DROP POLICY IF EXISTS "Anyone can log an affiliate click" ON public.affiliate_clicks;
CREATE POLICY "Clicks must belong to a real affiliate"
ON public.affiliate_clicks FOR INSERT
WITH CHECK (
  affiliate_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id)
);

-- 3. assignment_submissions: no self-grading on insert
CREATE OR REPLACE FUNCTION public.block_self_grade_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN
    RETURN NEW;
  END IF;
  NEW.grade := NULL;
  NEW.graded_by := NULL;
  NEW.graded_at := NULL;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_block_self_grade_on_insert ON public.assignment_submissions;
CREATE TRIGGER trg_block_self_grade_on_insert
BEFORE INSERT ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.block_self_grade_on_insert();

-- 4. quiz_attempts: score must come from the server-side grader
CREATE OR REPLACE FUNCTION public.block_self_reported_quiz_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.quiz_grading', true) = 'on' THEN RETURN NEW; END IF;
  IF public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Quiz scores must be submitted through the grading function.'
    USING ERRCODE = 'insufficient_privilege';
END $$;

DROP TRIGGER IF EXISTS trg_block_self_reported_quiz_score ON public.quiz_attempts;
CREATE TRIGGER trg_block_self_reported_quiz_score
BEFORE INSERT OR UPDATE OF score ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.block_self_reported_quiz_score();

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
  PERFORM set_config('app.quiz_grading', 'on', true);
  INSERT INTO public.quiz_attempts (user_id, quiz_id, score, answers)
  VALUES (v_user, p_quiz_id, v_score, p_answers);
  PERFORM set_config('app.quiz_grading', 'off', true);

  RETURN QUERY SELECT v_score, v_passed, v_pass;
END;
$function$;

-- 5. orders: self-inserted orders must start as pending with no fabricated state
CREATE OR REPLACE FUNCTION public.force_pending_order_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;
  IF public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]) THEN RETURN NEW; END IF;
  NEW.status := 'pending';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_force_pending_order_on_insert ON public.orders;
CREATE TRIGGER trg_force_pending_order_on_insert
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.force_pending_order_on_insert();
