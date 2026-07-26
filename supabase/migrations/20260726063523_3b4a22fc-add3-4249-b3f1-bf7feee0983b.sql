
-- 1) On lesson completion, also insert into lesson_unlocks for the NEXT lesson.
--    This makes lesson_unlocks the single source of truth for "can access".
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

  -- authoritative signal
  INSERT INTO public.lesson_unlocks (user_id, lesson_id, granted_by, note)
  VALUES (NEW.user_id, v_next, NULL, 'auto: previous lesson completed')
  ON CONFLICT (user_id, lesson_id) DO NOTHING;

  -- keep the redundant per-progress flag in sync (safety net)
  INSERT INTO public.lesson_progress (user_id, lesson_id, is_completed, is_unlocked)
  VALUES (NEW.user_id, v_next, false, true)
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET is_unlocked = true;

  RETURN NEW;
END; $$;

-- 2) When a student first gains access to a course, seed the first lesson unlock.
CREATE OR REPLACE FUNCTION public.seed_first_lesson_unlock(_user_id uuid, _course_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_first uuid;
BEGIN
  IF _user_id IS NULL OR _course_id IS NULL THEN RETURN; END IF;
  SELECT l.id INTO v_first
  FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
  WHERE m.course_id = _course_id
  ORDER BY m.order_index, l.order_index
  LIMIT 1;
  IF v_first IS NULL THEN RETURN; END IF;
  INSERT INTO public.lesson_unlocks (user_id, lesson_id, note)
  VALUES (_user_id, v_first, 'auto: course access granted')
  ON CONFLICT (user_id, lesson_id) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.seed_first_lesson_on_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.course_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.payment_status,'') IN ('paid','success','completed','confirmed','granted')
     OR COALESCE(NEW.access_source,'') IN ('manual_grant','promo','bootcamp') THEN
    PERFORM public.seed_first_lesson_unlock(NEW.user_id, NEW.course_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_seed_first_lesson_on_enrollment ON public.enrollments;
CREATE TRIGGER trg_seed_first_lesson_on_enrollment
AFTER INSERT OR UPDATE OF payment_status, access_source ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.seed_first_lesson_on_enrollment();

CREATE OR REPLACE FUNCTION public.seed_first_lesson_on_cohort_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_course uuid;
BEGIN
  SELECT course_id INTO v_course FROM public.cohorts WHERE id = NEW.cohort_id;
  IF v_course IS NOT NULL THEN
    PERFORM public.seed_first_lesson_unlock(NEW.user_id, v_course);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_seed_first_lesson_on_cohort_member ON public.cohort_members;
CREATE TRIGGER trg_seed_first_lesson_on_cohort_member
AFTER INSERT ON public.cohort_members
FOR EACH ROW EXECUTE FUNCTION public.seed_first_lesson_on_cohort_member();

-- 3) Backfill: first lesson unlock for every student who has course access today.
--    Enrolled users (paid / granted / manual / promo / bootcamp).
INSERT INTO public.lesson_unlocks (user_id, lesson_id, note)
SELECT DISTINCT e.user_id, first_l.id, 'backfill: existing access'
FROM public.enrollments e
JOIN LATERAL (
  SELECT l.id FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  WHERE m.course_id = e.course_id
  ORDER BY m.order_index, l.order_index LIMIT 1
) first_l ON true
WHERE COALESCE(e.payment_status,'') IN ('paid','success','completed','confirmed','granted')
   OR COALESCE(e.access_source,'') IN ('manual_grant','promo','bootcamp')
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- Cohort members
INSERT INTO public.lesson_unlocks (user_id, lesson_id, note)
SELECT DISTINCT cm.user_id, first_l.id, 'backfill: cohort member'
FROM public.cohort_members cm
JOIN public.cohorts c ON c.id = cm.cohort_id
JOIN LATERAL (
  SELECT l.id FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  WHERE m.course_id = c.course_id
  ORDER BY m.order_index, l.order_index LIMIT 1
) first_l ON true
WHERE c.course_id IS NOT NULL
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- Backfill: for every completed lesson, unlock the next one.
INSERT INTO public.lesson_unlocks (user_id, lesson_id, note)
SELECT DISTINCT lp.user_id, next_l.id, 'backfill: prior lesson completed'
FROM public.lesson_progress lp
JOIN public.lessons l ON l.id = lp.lesson_id
JOIN public.modules m ON m.id = l.module_id
JOIN LATERAL (
  SELECT l2.id FROM public.lessons l2 JOIN public.modules m2 ON m2.id = l2.module_id
  WHERE m2.course_id = m.course_id
    AND (m2.order_index > m.order_index
      OR (m2.order_index = m.order_index AND l2.order_index > l.order_index))
  ORDER BY m2.order_index, l2.order_index LIMIT 1
) next_l ON true
WHERE lp.is_completed = true
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- 4) Audit trail for any staff-driven lesson_unlocks mutation.
CREATE OR REPLACE FUNCTION public.log_lesson_unlock_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    -- system/trigger-driven writes (auto seeding, backfill) are not admin actions
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF NOT public.has_any_role(v_actor, ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  INSERT INTO public.admin_activity_log (admin_user_id, action, entity_type, entity_id, details)
  VALUES (
    v_actor,
    CASE WHEN TG_OP = 'INSERT' THEN 'lesson_unlock_grant' ELSE 'lesson_unlock_revoke' END,
    'lesson_unlock',
    COALESCE(NEW.lesson_id, OLD.lesson_id)::text,
    jsonb_build_object(
      'user_id',   COALESCE(NEW.user_id, OLD.user_id),
      'lesson_id', COALESCE(NEW.lesson_id, OLD.lesson_id),
      'note',      COALESCE(NEW.note, OLD.note)
    )
  );
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_log_lesson_unlock_change ON public.lesson_unlocks;
CREATE TRIGGER trg_log_lesson_unlock_change
AFTER INSERT OR DELETE ON public.lesson_unlocks
FOR EACH ROW EXECUTE FUNCTION public.log_lesson_unlock_change();
