
-- Notify students when an assignment becomes visible
CREATE OR REPLACE FUNCTION public.notify_assignment_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid;
BEGIN
  IF NEW.is_visible IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.is_visible, false) = true THEN RETURN NEW; END IF;

  SELECT m.course_id INTO v_course
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = NEW.lesson_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT e.user_id,
         'New assignment: ' || NEW.title,
         COALESCE(LEFT(NEW.description, 160), 'A new assignment is available in your course.'),
         'info',
         '/courses/' || v_course || '/learn?lesson=' || NEW.lesson_id || '&tab=assignments'
  FROM public.enrollments e
  WHERE e.course_id = v_course;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assignment_published ON public.assignments;
CREATE TRIGGER trg_notify_assignment_published
  AFTER INSERT OR UPDATE OF is_visible ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_published();

-- Notify students when a quiz becomes visible
CREATE OR REPLACE FUNCTION public.notify_quiz_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid;
BEGIN
  IF NEW.is_visible IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.is_visible, false) = true THEN RETURN NEW; END IF;

  SELECT m.course_id INTO v_course
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = NEW.lesson_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT e.user_id,
         'New quiz: ' || NEW.title,
         'A new quiz is available in your course.',
         'info',
         '/courses/' || v_course || '/learn?lesson=' || NEW.lesson_id || '&tab=quizzes'
  FROM public.enrollments e
  WHERE e.course_id = v_course;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_quiz_published ON public.quizzes;
CREATE TRIGGER trg_notify_quiz_published
  AFTER INSERT OR UPDATE OF is_visible ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.notify_quiz_published();
