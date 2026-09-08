DROP POLICY IF EXISTS "own submissions write" ON public.assignment_submissions;
CREATE POLICY "own submissions write"
ON public.assignment_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    is_paid_enrolled_for_assignment(assignment_id)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  )
  AND (
    has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role])
    OR (grade IS NULL AND feedback IS NULL AND graded_by IS NULL AND graded_at IS NULL)
  )
);