-- Allow staff-run backfills to bypass the sequential-completion and
-- assignment-before-complete gates. The flag is only honoured when the caller
-- is actually staff, so learners cannot use it to skip ahead.
CREATE OR REPLACE FUNCTION public.enforce_lesson_unlock_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_course uuid; v_my_mod int; v_my_les int; v_prev_id uuid;
BEGIN
  IF NEW.is_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF current_setting('app.staff_backfill', true) = 'on'
     AND public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN
    NEW.is_unlocked := true; RETURN NEW;
  END IF;
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
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_assignment_before_complete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
declare
  v_assignment_id uuid;
begin
  if NEW.is_completed is not true then
    return NEW;
  end if;

  if current_setting('app.staff_backfill', true) = 'on'
     and public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) then
    return NEW;
  end if;

  if public.has_role(NEW.user_id, 'admin'::app_role) or public.has_role(NEW.user_id, 'moderator'::app_role) then
    return NEW;
  end if;

  select id into v_assignment_id
  from public.assignments
  where lesson_id = NEW.lesson_id
    and is_visible = true
  limit 1;

  if v_assignment_id is null then
    return NEW;
  end if;

  if not exists (
    select 1 from public.assignment_submissions
    where assignment_id = v_assignment_id
      and user_id = NEW.user_id
  ) then
    raise exception 'Submit the assignment for this lesson before marking it complete.'
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

-- Bulk action: for every learner who submitted an assignment in this course,
-- unlock + mark complete that lesson and all lessons that come before it.
CREATE OR REPLACE FUNCTION public.mark_submitters_complete(p_course_id uuid)
RETURNS TABLE (learners integer, lessons_completed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_learners integer := 0;
  v_lessons integer := 0;
BEGIN
  IF NOT (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role])
    OR public.instructor_teaches_course(p_course_id, auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorised to run this action.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM set_config('app.staff_backfill', 'on', true);

  CREATE TEMP TABLE _ordered ON COMMIT DROP AS
  SELECT l.id AS lesson_id,
         row_number() OVER (ORDER BY m.order_index, l.order_index) AS pos
  FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
  WHERE m.course_id = p_course_id;

  CREATE TEMP TABLE _targets ON COMMIT DROP AS
  WITH maxpos AS (
    SELECT s.user_id, MAX(o.pos) AS pos
    FROM public.assignment_submissions s
    JOIN public.assignments a ON a.id = s.assignment_id
    JOIN _ordered o ON o.lesson_id = a.lesson_id
    GROUP BY s.user_id
  )
  SELECT mp.user_id, o.lesson_id
  FROM maxpos mp
  JOIN _ordered o ON o.pos <= mp.pos;

  SELECT COUNT(DISTINCT user_id) INTO v_learners FROM _targets;

  INSERT INTO public.lesson_unlocks (user_id, lesson_id, granted_by, note)
  SELECT t.user_id, t.lesson_id, auth.uid(), 'Bulk: assignment submitted'
  FROM _targets t
  ON CONFLICT (user_id, lesson_id) DO NOTHING;

  INSERT INTO public.lesson_progress (user_id, lesson_id, is_completed, is_unlocked, completed_at)
  SELECT t.user_id, t.lesson_id, true, true, now()
  FROM _targets t
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET is_completed = true,
        is_unlocked = true,
        completed_at = COALESCE(public.lesson_progress.completed_at, now());

  GET DIAGNOSTICS v_lessons = ROW_COUNT;

  INSERT INTO public.admin_activity_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'bulk_mark_submitters_complete', 'course', p_course_id::text,
          jsonb_build_object('learners', v_learners, 'lessons', v_lessons));

  PERFORM set_config('app.staff_backfill', 'off', true);

  learners := v_learners;
  lessons_completed := v_lessons;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_submitters_complete(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_submitters_complete(uuid) TO authenticated;