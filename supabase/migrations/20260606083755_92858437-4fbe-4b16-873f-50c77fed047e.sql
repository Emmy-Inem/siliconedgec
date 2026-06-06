DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.enrollments;
CREATE POLICY "Users can insert own enrollments"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(payment_status, 'pending') IN ('pending', 'free')
);

DROP POLICY IF EXISTS "Users can update own enrollments" ON public.enrollments;
CREATE POLICY "Users can update own enrollments"
ON public.enrollments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- learners can only update progress/resume fields; payment_status must
    -- stay equal to its prior value (RLS sees OLD via USING, so this is a
    -- guard against client-side payment-status escalation).
    payment_status IS NOT DISTINCT FROM (
      SELECT e.payment_status FROM public.enrollments e WHERE e.id = enrollments.id
    )
    OR payment_status IN ('pending', 'free')
  )
);