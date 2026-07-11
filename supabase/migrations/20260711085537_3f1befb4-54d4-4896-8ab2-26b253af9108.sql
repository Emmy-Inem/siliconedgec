
-- Fix: 'free' payment_status is used for webinar registrations, not
-- real course access. Remove them from the cohort and tighten the
-- auto-join trigger so future webinar leads don't get pulled in.

DELETE FROM public.cohort_members cm
USING public.cohorts co
WHERE cm.cohort_id = co.id
  AND cm.role = 'member'
  AND co.course_id = '3b1f29ec-8fd4-4ff0-9357-1987b90e6c91'
  AND NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = cm.user_id
      AND e.course_id = co.course_id
      AND (
        COALESCE(e.payment_status,'') IN ('paid','success','completed','confirmed','granted','comped')
        OR COALESCE(e.access_source,'') IN ('manual_grant','promo','bootcamp')
      )
  );

CREATE OR REPLACE FUNCTION public.auto_join_course_cohort()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cohort uuid;
  v_has_access boolean;
BEGIN
  IF NEW.user_id IS NULL OR NEW.course_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 'free' status is webinar registration only — do NOT auto-join those.
  v_has_access := (
    COALESCE(NEW.payment_status,'') IN ('paid','success','completed','confirmed','granted','comped')
    OR COALESCE(NEW.access_source,'') IN ('manual_grant','promo','bootcamp')
  );
  IF NOT v_has_access THEN RETURN NEW; END IF;

  SELECT id INTO v_cohort
  FROM public.cohorts
  WHERE course_id = NEW.course_id
  ORDER BY start_date NULLS LAST, id
  LIMIT 1;

  IF v_cohort IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.cohort_members (cohort_id, user_id, role)
  VALUES (v_cohort, NEW.user_id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Refresh students_enrolled after the cleanup.
UPDATE public.courses c
   SET students_enrolled = COALESCE((
     SELECT count(DISTINCT cm.user_id)
     FROM public.cohort_members cm
     JOIN public.cohorts co ON co.id = cm.cohort_id
     WHERE co.course_id = c.id
   ), 0)
 WHERE cohort_only = true;
