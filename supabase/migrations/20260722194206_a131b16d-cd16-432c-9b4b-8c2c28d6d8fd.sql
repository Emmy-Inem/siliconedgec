
-- Add cohort_number to cohorts and bootcamp_cohorts, scoped per parent.

ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS cohort_number integer;
ALTER TABLE public.bootcamp_cohorts ADD COLUMN IF NOT EXISTS cohort_number integer;

-- Backfill cohorts: number per course_id (NULL parent grouped together), ordered by start_date, then created_at.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY course_id
           ORDER BY start_date NULLS LAST, created_at
         ) AS rn
  FROM public.cohorts
)
UPDATE public.cohorts c SET cohort_number = r.rn
FROM ranked r WHERE r.id = c.id AND c.cohort_number IS NULL;

-- Backfill bootcamp_cohorts.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY course_id
           ORDER BY start_date NULLS LAST, created_at
         ) AS rn
  FROM public.bootcamp_cohorts
)
UPDATE public.bootcamp_cohorts b SET cohort_number = r.rn
FROM ranked r WHERE r.id = b.id AND b.cohort_number IS NULL;

-- Uniqueness per parent (course_id nullable → two partial indexes).
CREATE UNIQUE INDEX IF NOT EXISTS cohorts_course_number_uidx
  ON public.cohorts(course_id, cohort_number) WHERE course_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cohorts_null_course_number_uidx
  ON public.cohorts(cohort_number) WHERE course_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bootcamp_cohorts_course_number_uidx
  ON public.bootcamp_cohorts(course_id, cohort_number) WHERE course_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bootcamp_cohorts_null_course_number_uidx
  ON public.bootcamp_cohorts(cohort_number) WHERE course_id IS NULL;

-- Auto-assign next number on insert if not provided (scoped to course_id).
CREATE OR REPLACE FUNCTION public.assign_cohort_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cohort_number IS NULL THEN
    SELECT COALESCE(MAX(cohort_number), 0) + 1
      INTO NEW.cohort_number
      FROM public.cohorts
     WHERE course_id IS NOT DISTINCT FROM NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_bootcamp_cohort_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cohort_number IS NULL THEN
    SELECT COALESCE(MAX(cohort_number), 0) + 1
      INTO NEW.cohort_number
      FROM public.bootcamp_cohorts
     WHERE course_id IS NOT DISTINCT FROM NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_cohort_number ON public.cohorts;
CREATE TRIGGER trg_assign_cohort_number
BEFORE INSERT ON public.cohorts
FOR EACH ROW EXECUTE FUNCTION public.assign_cohort_number();

DROP TRIGGER IF EXISTS trg_assign_bootcamp_cohort_number ON public.bootcamp_cohorts;
CREATE TRIGGER trg_assign_bootcamp_cohort_number
BEFORE INSERT ON public.bootcamp_cohorts
FOR EACH ROW EXECUTE FUNCTION public.assign_bootcamp_cohort_number();
