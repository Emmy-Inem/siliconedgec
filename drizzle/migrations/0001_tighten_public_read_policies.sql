DROP POLICY IF EXISTS "Anon can view testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Testimonials viewable by everyone" ON public.testimonials;
CREATE POLICY "Published testimonials are public" ON public.testimonials FOR SELECT
  USING (is_published = true OR public.has_any_role(auth.uid(), ARRAY['admin','moderator','content_editor']::app_role[]));

DROP POLICY IF EXISTS "Anon can view site content" ON public.site_content;
DROP POLICY IF EXISTS "Site content viewable by everyone" ON public.site_content;
CREATE POLICY "Public site content is readable" ON public.site_content FOR SELECT
  USING (
    (key NOT LIKE 'automation\_%' AND key NOT LIKE 'tpl\_%')
    OR public.has_any_role(auth.uid(), ARRAY['admin','moderator','content_editor','support']::app_role[])
  );

DROP POLICY IF EXISTS "Anon can view categories" ON public.categories;
DROP POLICY IF EXISTS "Anon can view course tags" ON public.course_tags;
DROP POLICY IF EXISTS "Anon can view instructors" ON public.instructors;
DROP POLICY IF EXISTS "Anon can view path courses" ON public.learning_path_courses;
DROP POLICY IF EXISTS "Anon can view page seo" ON public.page_seo;
DROP POLICY IF EXISTS "Anon can view pricing plans" ON public.pricing_plans;
DROP POLICY IF EXISTS "Anon can view tags" ON public.tags;