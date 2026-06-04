-- 1) Course announcements: paid enrollment or admin only
DROP POLICY IF EXISTS "Enrolled users or admins can view announcements" ON public.course_announcements;
CREATE POLICY "Paid enrolled or admins view announcements"
ON public.course_announcements
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR is_paid_enrolled(course_id)
);

-- 2) course-resources storage bucket: require paid status
DROP POLICY IF EXISTS "Enrolled users can read course resources" ON storage.objects;
CREATE POLICY "Paid enrolled or admins read course resources"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-resources'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.lesson_resources lr
      WHERE lr.file_path = storage.objects.name
        AND is_paid_enrolled(lr.course_id)
    )
  )
);

-- 3) quiz_questions: remove enrolled-user SELECT (which exposed correct_answer).
-- Students must now fetch questions via the get_quiz_questions RPC, which omits
-- the answer key. Admin/moderator policies remain for authoring.
DROP POLICY IF EXISTS "Paid enrolled or admin read quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Enrolled or admin read quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Quiz questions readable by enrolled" ON public.quiz_questions;
-- Keep admin/moderator SELECT only
CREATE POLICY "Admins read quiz questions"
ON public.quiz_questions
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);