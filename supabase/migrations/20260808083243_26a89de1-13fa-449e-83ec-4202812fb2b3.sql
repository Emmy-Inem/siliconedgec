DROP POLICY IF EXISTS "Anyone can apply as affiliate" ON public.affiliates;

CREATE POLICY "Apply as affiliate for self"
ON public.affiliates
FOR INSERT
WITH CHECK (
  status = 'pending'
  AND (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR user_id = auth.uid()
  )
);