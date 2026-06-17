-- 1) Google Calendar tokens: allow users to insert/update their own row
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='google_calendar_tokens' AND policyname='Users can insert their calendar tokens'
  ) THEN
    CREATE POLICY "Users can insert their calendar tokens"
      ON public.google_calendar_tokens FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='google_calendar_tokens' AND policyname='Users can update their calendar tokens'
  ) THEN
    CREATE POLICY "Users can update their calendar tokens"
      ON public.google_calendar_tokens FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2) Drop duplicate admin-manage policy on quiz_questions (keep the canonical one)
DROP POLICY IF EXISTS "Admins manage quiz questions" ON public.quiz_questions;
