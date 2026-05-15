
-- Notify all enrolled students in-app whenever a live class is scheduled or rescheduled.
CREATE OR REPLACE FUNCTION public.notify_live_class_scheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_title TEXT;
  when_text TEXT;
BEGIN
  -- Skip cancelled classes
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;

  -- On UPDATE, only notify if the time actually changed (reschedule)
  IF TG_OP = 'UPDATE' AND OLD.scheduled_at = NEW.scheduled_at AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT title INTO course_title FROM public.courses WHERE id = NEW.course_id;
  when_text := to_char(NEW.scheduled_at AT TIME ZONE 'Africa/Lagos', 'Dy DD Mon, HH24:MI') || ' WAT';

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT DISTINCT e.user_id,
         CASE WHEN TG_OP = 'INSERT' THEN 'New live class: ' || NEW.title
              ELSE 'Live class rescheduled: ' || NEW.title END,
         COALESCE(course_title, 'Your course') || ' · ' || when_text,
         'info',
         '/courses/' || NEW.course_id || '/learn'
  FROM public.enrollments e
  WHERE e.course_id = NEW.course_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_live_class_scheduled ON public.live_classes;
CREATE TRIGGER trg_notify_live_class_scheduled
AFTER INSERT OR UPDATE ON public.live_classes
FOR EACH ROW EXECUTE FUNCTION public.notify_live_class_scheduled();
