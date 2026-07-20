
-- 1) Tighten quiz_attempts INSERT: require enrollment (or staff)
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can insert own quiz attempts"
  ON public.quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role])
      OR EXISTS (
        SELECT 1 FROM public.quizzes q
        WHERE q.id = quiz_attempts.quiz_id
          AND (q.lesson_id IS NULL OR public.is_paid_enrolled_for_lesson(q.lesson_id))
      )
    )
  );

-- 2) Tighten ai_quiz_attempts INSERT
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE tablename='ai_quiz_attempts' AND schemaname='public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_quiz_attempts', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users read own ai quiz attempts"
  ON public.ai_quiz_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role]));

CREATE POLICY "Users insert own ai quiz attempts"
  ON public.ai_quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role])
      OR public.is_paid_enrolled_for_lesson(lesson_id)
    )
  );

CREATE POLICY "Admins manage ai quiz attempts"
  ON public.ai_quiz_attempts FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role]));

-- 3) chat_messages: block sender_role spoofing
DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;
CREATE POLICY "Participants can send messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      (
        sender_role IN ('admin','moderator','support')
        AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'support'::app_role])
      )
      OR
      (
        sender_role = 'user'
        AND EXISTS (
          SELECT 1 FROM public.chat_conversations c
          WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()
        )
      )
    )
  );

-- 4) Per-user AI quiz reveal
CREATE TABLE IF NOT EXISTS public.ai_quiz_reveals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL,
  quiz_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT ON public.ai_quiz_reveals TO authenticated;
GRANT ALL ON public.ai_quiz_reveals TO service_role;
ALTER TABLE public.ai_quiz_reveals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own reveals" ON public.ai_quiz_reveals;
CREATE POLICY "Users manage own reveals"
  ON public.ai_quiz_reveals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.reveal_ai_quiz_for_lesson(_lesson_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_quiz uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.is_paid_enrolled_for_lesson(_lesson_id) THEN
    RAISE EXCEPTION 'not enrolled' USING ERRCODE='insufficient_privilege';
  END IF;
  SELECT id INTO v_quiz FROM public.quizzes
   WHERE lesson_id = _lesson_id AND is_ai_generated = true
   ORDER BY created_at DESC LIMIT 1;
  IF v_quiz IS NULL THEN
    SELECT id INTO v_quiz FROM public.quizzes WHERE lesson_id = _lesson_id LIMIT 1;
  END IF;
  IF v_quiz IS NOT NULL THEN
    INSERT INTO public.ai_quiz_reveals(user_id, lesson_id, quiz_id)
    VALUES (auth.uid(), _lesson_id, v_quiz)
    ON CONFLICT (user_id, lesson_id) DO NOTHING;
  END IF;
  RETURN v_quiz;
END $$;

-- 5) Revoke EXECUTE from anon on non-public SECURITY DEFINER functions
DO $$
DECLARE f record;
  keep_anon text[] := ARRAY[
    'resolve_promo_slug','validate_promo_code','verify_certificate',
    'get_public_profiles','is_ip_blocked'
  ];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    IF f.proname = ANY(keep_anon) THEN CONTINUE; END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', f.sig);
  END LOOP;
END $$;

-- 6) Revoke EXECUTE from authenticated on trigger-only / server-only functions
DO $$
DECLARE f record;
  trigger_only text[] := ARRAY[
    'handle_new_user','update_updated_at_column','set_course_slug',
    'unique_course_slug','slugify',
    'notify_application_status_change','notify_course_announcement',
    'notify_assignment_submission','notify_assignment_published',
    'notify_quiz_published','notify_live_class_scheduled','notify_cohort_post',
    'notify_cohort_session','notify_lesson_comment_reply','notify_course_completion',
    'notify_next_lesson_unlock',
    'award_lesson_xp','award_course_xp',
    'sync_students_enrolled','sync_cohort_only_students_enrolled',
    'sync_jobs_applications_count','sync_promo_usage_count',
    'auto_enroll_on_registration','auto_join_course_cohort',
    'auto_record_influencer_referral','auto_record_influencer_referral_order',
    'link_bootcamp_enrollment_on_signup',
    'issue_certificate_on_completion','touch_enrollment_last_lesson',
    'recompute_enrollment_progress','update_chat_on_message',
    'enforce_lesson_unlock_order','enforce_manual_assignment_visibility',
    'prevent_self_paid_enrollment',
    'protect_rsvp_attendance_fields','protect_submission_grading_fields'
  ];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    IF f.proname = ANY(trigger_only) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', f.sig);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', f.sig);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.sig);
    END IF;
  END LOOP;
END $$;
