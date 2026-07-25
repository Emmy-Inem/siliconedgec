ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS is_unlocked boolean NOT NULL DEFAULT false;

UPDATE public.lesson_progress SET is_unlocked = true WHERE is_completed = true AND is_unlocked = false;

-- Auto-unlock the lesson right after every completed one. Deduplicate
-- (user_id, next_lesson) so ON CONFLICT never sees the same row twice.
INSERT INTO public.lesson_progress (user_id, lesson_id, is_completed, is_unlocked)
SELECT DISTINCT ON (lp.user_id, next_l.id) lp.user_id, next_l.id, false, true
FROM public.lesson_progress lp
JOIN public.lessons l ON l.id = lp.lesson_id
JOIN public.modules m ON m.id = l.module_id
JOIN LATERAL (
  SELECT l2.id
  FROM public.lessons l2 JOIN public.modules m2 ON m2.id = l2.module_id
  WHERE m2.course_id = m.course_id
    AND (m2.order_index > m.order_index
      OR (m2.order_index = m.order_index AND l2.order_index > l.order_index))
  ORDER BY m2.order_index, l2.order_index
  LIMIT 1
) next_l ON true
WHERE lp.is_completed = true
ON CONFLICT (user_id, lesson_id) DO UPDATE SET is_unlocked = true;

INSERT INTO public.lesson_progress (user_id, lesson_id, is_completed, is_unlocked)
SELECT DISTINCT ON (lu.user_id, lu.lesson_id) lu.user_id, lu.lesson_id, false, true
FROM public.lesson_unlocks lu
ON CONFLICT (user_id, lesson_id) DO UPDATE SET is_unlocked = true;

CREATE OR REPLACE FUNCTION public.enforce_lesson_unlock_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_course uuid; v_my_mod int; v_my_les int; v_prev_id uuid;
BEGIN
  IF NEW.is_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF public.has_any_role(NEW.user_id, ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN
    NEW.is_unlocked := true; RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.lesson_unlocks WHERE user_id = NEW.user_id AND lesson_id = NEW.lesson_id) THEN
    NEW.is_unlocked := true; RETURN NEW;
  END IF;
  SELECT m.course_id, m.order_index, l.order_index INTO v_course, v_my_mod, v_my_les
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id WHERE l.id = NEW.lesson_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;
  SELECT l.id INTO v_prev_id FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
   WHERE m.course_id = v_course
     AND (m.order_index < v_my_mod OR (m.order_index = v_my_mod AND l.order_index < v_my_les))
   ORDER BY m.order_index DESC, l.order_index DESC LIMIT 1;
  IF v_prev_id IS NULL THEN NEW.is_unlocked := true; RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.lesson_progress
    WHERE user_id = NEW.user_id AND lesson_id = v_prev_id
      AND (is_unlocked = true OR is_completed = true)
  ) THEN
    RAISE EXCEPTION 'Complete or unlock the previous lesson before marking this one done.' USING ERRCODE = 'check_violation';
  END IF;
  NEW.is_unlocked := true; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.unlock_next_lesson_on_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_course uuid; v_mod int; v_les int; v_next uuid;
BEGIN
  IF NEW.is_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.is_completed, false) = true THEN RETURN NEW; END IF;
  SELECT m.course_id, m.order_index, l.order_index INTO v_course, v_mod, v_les
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id WHERE l.id = NEW.lesson_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;
  SELECT l.id INTO v_next FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
   WHERE m.course_id = v_course
     AND (m.order_index > v_mod OR (m.order_index = v_mod AND l.order_index > v_les))
   ORDER BY m.order_index, l.order_index LIMIT 1;
  IF v_next IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.lesson_progress (user_id, lesson_id, is_completed, is_unlocked)
  VALUES (NEW.user_id, v_next, false, true)
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET is_unlocked = true;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_unlock_next_lesson ON public.lesson_progress;
CREATE TRIGGER trg_unlock_next_lesson AFTER INSERT OR UPDATE OF is_completed ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.unlock_next_lesson_on_completion();

CREATE OR REPLACE FUNCTION public.sync_lesson_unlock_to_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lesson_progress (user_id, lesson_id, is_completed, is_unlocked)
  VALUES (NEW.user_id, NEW.lesson_id, false, true)
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET is_unlocked = true;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_lesson_unlock ON public.lesson_unlocks;
CREATE TRIGGER trg_sync_lesson_unlock AFTER INSERT ON public.lesson_unlocks
FOR EACH ROW EXECUTE FUNCTION public.sync_lesson_unlock_to_progress();

COMMENT ON FUNCTION public.auto_join_course_cohort() IS
  'Fires only on individual enrollment INSERTs. Any bulk cohort backfill must be a one-shot admin-reviewed migration — never auto-scheduled.';
