CREATE OR REPLACE FUNCTION public.notify_next_lesson_unlock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid;
  v_my_mod int;
  v_my_les int;
  v_next_id uuid;
  v_next_title text;
  v_course_title text;
BEGIN
  IF NEW.is_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.is_completed, false) = true THEN RETURN NEW; END IF;

  SELECT m.course_id, m.order_index, l.order_index
    INTO v_course, v_my_mod, v_my_les
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = NEW.lesson_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;

  SELECT l.id, l.title INTO v_next_id, v_next_title
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE m.course_id = v_course
    AND (m.order_index > v_my_mod
         OR (m.order_index = v_my_mod AND l.order_index > v_my_les))
  ORDER BY m.order_index ASC, l.order_index ASC
  LIMIT 1;

  IF v_next_id IS NULL THEN RETURN NEW; END IF;

  SELECT title INTO v_course_title FROM public.courses WHERE id = v_course;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.user_id,
    'New lesson unlocked',
    COALESCE(v_next_title, 'Next lesson') || ' is now available in ' || COALESCE(v_course_title, 'your course') || '.',
    'success',
    '/courses/' || v_course || '/learn?lesson=' || v_next_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_next_lesson_unlock ON public.lesson_progress;
CREATE TRIGGER trg_notify_next_lesson_unlock
AFTER INSERT OR UPDATE OF is_completed ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.notify_next_lesson_unlock();