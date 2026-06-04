-- 1) Resume position column for continuing playback
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS resume_position_seconds integer NOT NULL DEFAULT 0;

-- 2) Server-side premature-unlock guard on lesson_progress
CREATE OR REPLACE FUNCTION public.enforce_lesson_unlock_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid;
  v_my_mod int;
  v_my_les int;
  v_prev_id uuid;
BEGIN
  IF NEW.is_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF public.has_role(NEW.user_id, 'admin'::app_role) OR public.has_role(NEW.user_id, 'moderator'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT m.course_id, m.order_index, l.order_index
    INTO v_course, v_my_mod, v_my_les
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = NEW.lesson_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;

  SELECT l.id INTO v_prev_id
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE m.course_id = v_course
    AND (m.order_index < v_my_mod
         OR (m.order_index = v_my_mod AND l.order_index < v_my_les))
  ORDER BY m.order_index DESC, l.order_index DESC
  LIMIT 1;

  IF v_prev_id IS NULL THEN RETURN NEW; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lesson_progress
    WHERE user_id = NEW.user_id AND lesson_id = v_prev_id AND is_completed = true
  ) THEN
    RAISE EXCEPTION 'Complete the previous lesson before marking this one done.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_lesson_unlock_order ON public.lesson_progress;
CREATE TRIGGER trg_enforce_lesson_unlock_order
BEFORE INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.enforce_lesson_unlock_order();

-- 3) Course completion notification
CREATE OR REPLACE FUNCTION public.notify_course_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.is_completed IS TRUE AND COALESCE(OLD.is_completed, false) = false THEN
    SELECT title INTO v_title FROM public.courses WHERE id = NEW.course_id;
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Course completed!',
      'Congratulations on completing ' || COALESCE(v_title, 'your course') || '. Your certificate is ready.',
      'success',
      '/certificates'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_course_completion ON public.enrollments;
CREATE TRIGGER trg_notify_course_completion
AFTER UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.notify_course_completion();

-- 4) Lock down SECURITY DEFINER function execution.
-- Revoke broad PUBLIC execute, then re-grant to the roles that should call each.

-- Internal-only (trigger functions or used by other defs): no client EXECUTE
DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'public.handle_new_user()',
    'public.update_updated_at_column()',
    'public.set_course_slug()',
    'public.slugify(text)',
    'public.unique_course_slug(text, uuid)',
    'public.issue_certificate_on_completion()',
    'public.notify_application_status_change()',
    'public.notify_course_announcement()',
    'public.notify_live_class_scheduled()',
    'public.notify_course_completion()',
    'public.sync_students_enrolled()',
    'public.sync_jobs_applications_count()',
    'public.sync_promo_usage_count()',
    'public.touch_enrollment_last_lesson()',
    'public.award_lesson_xp()',
    'public.award_course_xp()',
    'public.recompute_enrollment_progress()',
    'public.update_chat_on_message()',
    'public.auto_enroll_on_registration()',
    'public.auto_record_influencer_referral()',
    'public.auto_record_influencer_referral_order()',
    'public.enforce_lesson_unlock_order()',
    'public.is_ip_blocked(text)',
    'public.is_login_locked(text, text)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- Authenticated-only RPCs / RLS helpers
DO $$
DECLARE
  fn text;
  auth_fns text[] := ARRAY[
    'public.has_role(uuid, app_role)',
    'public.is_paid_enrolled(uuid)',
    'public.get_user_xp(uuid)',
    'public.get_profiles_count()',
    'public.get_quiz_questions(uuid)',
    'public.get_public_profiles(uuid[])',
    'public.grade_quiz_submission(uuid, jsonb)',
    'public.validate_promo_code(text)',
    'public.influencer_click_counts()',
    'public.clear_login_lockout(text)'
  ];
BEGIN
  FOREACH fn IN ARRAY auth_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- Truly public RPCs (verification + influencer landing)
DO $$
DECLARE
  fn text;
  pub_fns text[] := ARRAY[
    'public.verify_certificate(text)',
    'public.resolve_promo_slug(text)'
  ];
BEGIN
  FOREACH fn IN ARRAY pub_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', fn);
  END LOOP;
END $$;