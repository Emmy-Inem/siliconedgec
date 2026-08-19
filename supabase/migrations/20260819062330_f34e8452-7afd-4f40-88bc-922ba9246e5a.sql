-- 1. search_path on email queue functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, extensions;

-- 2. ai_quiz_attempts: only server-side grading may write attempts
DROP POLICY IF EXISTS "Users insert own ai quiz attempts" ON public.ai_quiz_attempts;

-- 3. mock_interview_sessions: only server-side interview function may write sessions
DROP POLICY IF EXISTS "Learners create own interview sessions" ON public.mock_interview_sessions;

CREATE OR REPLACE FUNCTION public.block_self_reported_interview_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server-side (service role / edge function) has no auth.uid()
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Mock interview results must be recorded by the interview service.'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_self_reported_interview_score ON public.mock_interview_sessions;
CREATE TRIGGER trg_block_self_reported_interview_score
BEFORE INSERT OR UPDATE OF score, strengths, improvements, summary
ON public.mock_interview_sessions
FOR EACH ROW EXECUTE FUNCTION public.block_self_reported_interview_score();