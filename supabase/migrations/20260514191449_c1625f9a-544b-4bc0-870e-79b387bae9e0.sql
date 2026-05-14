-- Drop duplicate triggers (kept canonical ones)
DROP TRIGGER IF EXISTS sync_enrollment_count ON public.enrollments;
DROP TRIGGER IF EXISTS update_enrollments_updated_at ON public.enrollments;

-- Reconcile inflated students_enrolled counts.
-- Use distinct (user_id, course_id) so historic duplicate-trigger inflation
-- and any duplicate enrollment rows resolve to the true unique-learner count.
UPDATE public.courses c
SET students_enrolled = sub.cnt
FROM (
  SELECT course_id, COUNT(DISTINCT user_id)::int AS cnt
  FROM public.enrollments
  GROUP BY course_id
) sub
WHERE c.id = sub.course_id;

-- Zero out courses with no enrollments
UPDATE public.courses
SET students_enrolled = 0
WHERE id NOT IN (SELECT DISTINCT course_id FROM public.enrollments)
  AND COALESCE(students_enrolled, 0) <> 0;