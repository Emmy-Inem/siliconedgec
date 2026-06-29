CREATE POLICY cohort_materials_update
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cohort-materials' AND
  public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role, 'instructor'::app_role])
);