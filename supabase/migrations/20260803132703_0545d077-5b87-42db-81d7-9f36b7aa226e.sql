DROP POLICY IF EXISTS "Affiliates add own course selections" ON public.affiliate_course_selections;

CREATE POLICY "Affiliates add own course selections"
ON public.affiliate_course_selections
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.id = affiliate_course_selections.affiliate_id
      AND a.user_id = auth.uid()
  )
);