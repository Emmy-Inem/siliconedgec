
-- 1) widen check constraint to allow 'granted'
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_payment_status_check;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_payment_status_check
  CHECK (payment_status = ANY (ARRAY['pending','paid','refunded','free','comped','confirmed','success','granted']));

-- 2) rewrite notification triggers to respect cohort_only
CREATE OR REPLACE FUNCTION public.notify_assignment_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid;
  v_cohort_only boolean;
BEGIN
  IF NEW.is_visible IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.is_visible, false) = true THEN RETURN NEW; END IF;

  SELECT m.course_id INTO v_course
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = NEW.lesson_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(cohort_only, false) INTO v_cohort_only FROM public.courses WHERE id = v_course;

  IF v_cohort_only THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT DISTINCT cm.user_id,
           'New assignment: ' || NEW.title,
           COALESCE(LEFT(NEW.description, 160), 'A new assignment is available in your cohort course.'),
           'info',
           '/courses/' || v_course || '/learn?lesson=' || NEW.lesson_id || '&tab=assignments'
    FROM public.cohort_members cm
    JOIN public.cohorts co ON co.id = cm.cohort_id
    WHERE co.course_id = v_course;
  ELSE
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT e.user_id,
           'New assignment: ' || NEW.title,
           COALESCE(LEFT(NEW.description, 160), 'A new assignment is available in your course.'),
           'info',
           '/courses/' || v_course || '/learn?lesson=' || NEW.lesson_id || '&tab=assignments'
    FROM public.enrollments e
    WHERE e.course_id = v_course
      AND (
        COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed','granted')
        OR e.access_source IN ('manual_grant','promo','bootcamp')
      );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_quiz_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid;
  v_cohort_only boolean;
BEGIN
  IF NEW.is_visible IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.is_visible, false) = true THEN RETURN NEW; END IF;

  SELECT m.course_id INTO v_course
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE l.id = NEW.lesson_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(cohort_only, false) INTO v_cohort_only FROM public.courses WHERE id = v_course;

  IF v_cohort_only THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT DISTINCT cm.user_id,
           'New quiz: ' || NEW.title,
           'A new quiz is available in your cohort course.',
           'info',
           '/courses/' || v_course || '/learn?lesson=' || NEW.lesson_id || '&tab=quizzes'
    FROM public.cohort_members cm
    JOIN public.cohorts co ON co.id = cm.cohort_id
    WHERE co.course_id = v_course;
  ELSE
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT e.user_id,
           'New quiz: ' || NEW.title,
           'A new quiz is available in your course.',
           'info',
           '/courses/' || v_course || '/learn?lesson=' || NEW.lesson_id || '&tab=quizzes'
    FROM public.enrollments e
    WHERE e.course_id = v_course
      AND (
        COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed','granted')
        OR e.access_source IN ('manual_grant','promo','bootcamp')
      );
  END IF;

  RETURN NEW;
END;
$$;

-- 3) student count for cohort-only courses = cohort membership
CREATE OR REPLACE FUNCTION public.sync_cohort_only_students_enrolled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cohort uuid;
  v_course uuid;
BEGIN
  v_cohort := COALESCE(NEW.cohort_id, OLD.cohort_id);
  SELECT course_id INTO v_course FROM public.cohorts WHERE id = v_cohort;
  IF v_course IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  UPDATE public.courses c
     SET students_enrolled = (
       SELECT count(DISTINCT cm.user_id)
       FROM public.cohort_members cm
       JOIN public.cohorts co ON co.id = cm.cohort_id
       WHERE co.course_id = c.id
     )
   WHERE c.id = v_course AND c.cohort_only = true;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cohort_only_students_enrolled ON public.cohort_members;
CREATE TRIGGER trg_sync_cohort_only_students_enrolled
  AFTER INSERT OR DELETE ON public.cohort_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_cohort_only_students_enrolled();

-- one-time backfill
UPDATE public.courses c SET students_enrolled = (
  SELECT count(DISTINCT cm.user_id)
  FROM public.cohort_members cm
  JOIN public.cohorts co ON co.id = cm.cohort_id
  WHERE co.course_id = c.id
) WHERE c.cohort_only = true;
