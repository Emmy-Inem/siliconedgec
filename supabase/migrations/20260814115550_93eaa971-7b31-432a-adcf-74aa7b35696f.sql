-- 1. Block self-grading on insert (also clear feedback)
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
  NEW.feedback := NULL;
  NEW.graded_by := NULL;
  NEW.graded_at := NULL;
  RETURN NEW;
END;
$$;

-- 2. Lock is_unlocked on lesson_progress for non-staff
CREATE OR REPLACE FUNCTION public.protect_lesson_progress_unlock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;
  IF public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_unlocked := COALESCE(
      (SELECT true FROM public.lesson_unlocks lu
        WHERE lu.lesson_id = NEW.lesson_id AND lu.user_id = NEW.user_id LIMIT 1),
      false
    );
  ELSE
    NEW.is_unlocked := OLD.is_unlocked;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_lesson_progress_unlock ON public.lesson_progress;
CREATE TRIGGER trg_protect_lesson_progress_unlock
BEFORE INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.protect_lesson_progress_unlock();

-- 3. Fix mutable search_path on email queue helpers
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq, extensions;