DROP POLICY IF EXISTS "Enrolled users can view live classes" ON public.live_classes;

CREATE POLICY "Enrolled or registered users can view live classes"
ON public.live_classes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = live_classes.course_id AND e.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.course_registrations r WHERE r.course_id = live_classes.course_id AND r.user_id = auth.uid())
);