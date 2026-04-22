-- Reset students_enrolled to real enrollment counts so the UI shows accurate numbers
UPDATE public.courses c
SET students_enrolled = COALESCE((SELECT COUNT(*) FROM public.enrollments e WHERE e.course_id = c.id), 0);

-- Ensure the existing sync trigger fires on enrollments
DROP TRIGGER IF EXISTS sync_students_enrolled_trigger ON public.enrollments;
CREATE TRIGGER sync_students_enrolled_trigger
AFTER INSERT OR DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.sync_students_enrolled();

-- Centralized leads view: union of registrations + business leads + job applications
-- (no view needed — we'll fetch them separately in the UI hub)
