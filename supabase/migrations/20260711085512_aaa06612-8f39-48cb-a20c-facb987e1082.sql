
-- 1) Re-point Cloud Engineering Bootcamp Cohort 1 to the cohort_only course
--    "One-Month Cloud Engineering Bootcamp — Microsoft Azure" so all 11
--    existing cohort members gain access via cohort membership.
UPDATE public.cohorts
   SET course_id = '3b1f29ec-8fd4-4ff0-9357-1987b90e6c91'
 WHERE id = 'ff5a3dca-0815-42d2-8203-41b37966fc11';

-- 2) Refresh students_enrolled for cohort_only courses so the count matches
--    real cohort membership.
UPDATE public.courses c
   SET students_enrolled = COALESCE((
     SELECT count(DISTINCT cm.user_id)
     FROM public.cohort_members cm
     JOIN public.cohorts co ON co.id = cm.cohort_id
     WHERE co.course_id = c.id
   ), 0)
 WHERE cohort_only = true;

-- 3) Auto-add students to the course's cohort when they gain access
--    (paid, granted, comped, or manual/promo/bootcamp source). Picks the
--    earliest cohort for that course; skips if already a member.
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

  v_has_access := (
    COALESCE(NEW.payment_status,'') IN ('paid','success','completed','confirmed','granted','comped','free')
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

DROP TRIGGER IF EXISTS trg_auto_join_course_cohort ON public.enrollments;
CREATE TRIGGER trg_auto_join_course_cohort
AFTER INSERT OR UPDATE OF payment_status, access_source
ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.auto_join_course_cohort();

-- 4) Backfill: for every existing accessible enrollment on a cohort-having
--    course, ensure the user is in the cohort.
INSERT INTO public.cohort_members (cohort_id, user_id, role)
SELECT DISTINCT co.id, e.user_id, 'member'
FROM public.enrollments e
JOIN public.cohorts co ON co.course_id = e.course_id
WHERE (
        COALESCE(e.payment_status,'') IN ('paid','success','completed','confirmed','granted','comped','free')
     OR COALESCE(e.access_source,'') IN ('manual_grant','promo','bootcamp')
      )
  AND NOT EXISTS (
        SELECT 1 FROM public.cohort_members cm
        WHERE cm.cohort_id = co.id AND cm.user_id = e.user_id
      )
ON CONFLICT DO NOTHING;
