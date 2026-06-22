
-- Lock down login_attempts: only service_role/triggers may touch it
REVOKE ALL ON public.login_attempts FROM anon, authenticated;
GRANT ALL ON public.login_attempts TO service_role;

CREATE POLICY "Block client inserts on login_attempts"
ON public.login_attempts AS RESTRICTIVE FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block client updates on login_attempts"
ON public.login_attempts AS RESTRICTIVE FOR UPDATE
TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block client deletes on login_attempts"
ON public.login_attempts AS RESTRICTIVE FOR DELETE
TO anon, authenticated
USING (false);

-- Lock down quiz_questions direct reads (correct_answer column protection).
-- Admins/moderators keep access via the existing ALL policy. Learners must
-- use the get_quiz_questions security-definer RPC.
REVOKE SELECT ON public.quiz_questions FROM anon, authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
