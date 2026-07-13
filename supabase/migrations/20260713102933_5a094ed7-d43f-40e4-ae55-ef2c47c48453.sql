-- Tighten bootcamp enrollment read policy: do not trust email-only JWT claims for PII access.
DROP POLICY IF EXISTS "Users view their own bootcamp enrollment" ON public.bootcamp_enrollments;
CREATE POLICY "Users view their own bootcamp enrollment"
  ON public.bootcamp_enrollments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'moderator'::public.app_role])
  );

-- Tighten cohort material table reads: instructors only for cohorts they teach.
DROP POLICY IF EXISTS "cohort_materials_read" ON public.cohort_materials;
CREATE POLICY "cohort_materials_read"
  ON public.cohort_materials
  FOR SELECT
  TO authenticated
  USING (
    public.is_cohort_member(cohort_id, auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'moderator'::public.app_role])
    OR public.is_cohort_instructor(cohort_id, auth.uid())
  );

-- Storage path convention: cohort-materials object names begin with <cohort_uuid>/...
-- Recreate all cohort-materials storage policies with cohort-scoped instructor checks.
DROP POLICY IF EXISTS "cohort_materials_read" ON storage.objects;
DROP POLICY IF EXISTS "cohort_materials_write" ON storage.objects;
DROP POLICY IF EXISTS "cohort_materials_delete" ON storage.objects;
DROP POLICY IF EXISTS "cohort_materials_update" ON storage.objects;

CREATE POLICY "cohort_materials_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cohort-materials'
    AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (
      public.is_cohort_member((split_part(name, '/', 1))::uuid, auth.uid())
      OR public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'moderator'::public.app_role])
      OR public.is_cohort_instructor((split_part(name, '/', 1))::uuid, auth.uid())
    )
  );

CREATE POLICY "cohort_materials_write"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cohort-materials'
    AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (
      public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'moderator'::public.app_role])
      OR public.is_cohort_instructor((split_part(name, '/', 1))::uuid, auth.uid())
    )
  );

CREATE POLICY "cohort_materials_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cohort-materials'
    AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (
      public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'moderator'::public.app_role])
      OR public.is_cohort_instructor((split_part(name, '/', 1))::uuid, auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'cohort-materials'
    AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (
      public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'moderator'::public.app_role])
      OR public.is_cohort_instructor((split_part(name, '/', 1))::uuid, auth.uid())
    )
  );

CREATE POLICY "cohort_materials_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cohort-materials'
    AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (
      public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'moderator'::public.app_role])
      OR public.is_cohort_instructor((split_part(name, '/', 1))::uuid, auth.uid())
    )
  );