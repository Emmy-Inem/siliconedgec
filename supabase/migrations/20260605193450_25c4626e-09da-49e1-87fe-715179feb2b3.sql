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
  v_passed boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  SELECT q.passing_score INTO v_pass FROM public.quizzes q WHERE q.id = p_quiz_id;
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
$function$;