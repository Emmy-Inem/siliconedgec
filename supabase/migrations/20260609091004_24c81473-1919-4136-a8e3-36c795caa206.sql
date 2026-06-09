-- Allow anon to call has_role (returns false for null uid) so policies referencing it don't error out
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;

-- Scope admin-manage policies to authenticated only, so anon never evaluates has_role
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public'
      AND policyname IN (
        'Admins can manage courses','Admins can manage instructors','Admins can manage modules',
        'Admins can manage learning paths','Admins can manage path courses','Admins can manage pricing plans',
        'Admins can manage categories','Admins can manage tags','Admins can manage course tags',
        'Admins can manage reviews','Admins can manage lessons'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', rec.policyname, rec.tablename);
  END LOOP;
END $$;

CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can manage instructors" ON public.instructors FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "Admins can manage learning paths" ON public.learning_paths FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can manage path courses" ON public.learning_path_courses FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can manage pricing plans" ON public.pricing_plans FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can manage course tags" ON public.course_tags FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins can manage reviews" ON public.reviews FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));