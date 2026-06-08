-- Allow unauthenticated visitors to browse the public catalog. RLS still gates writes.
GRANT SELECT ON public.courses TO anon;
GRANT SELECT ON public.instructors TO anon;
GRANT SELECT ON public.modules TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.tags TO anon;
GRANT SELECT ON public.course_tags TO anon;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT ON public.learning_paths TO anon;
GRANT SELECT ON public.learning_path_courses TO anon;
GRANT SELECT ON public.brands TO anon;
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.cms_pages TO anon;
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT ON public.pricing_plans TO anon;
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT ON public.page_seo TO anon;

-- Ensure anon-visible RLS policies exist (idempotent guards).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.courses'::regclass AND polname='Anon can view published courses') THEN
    CREATE POLICY "Anon can view published courses" ON public.courses
      FOR SELECT TO anon USING (is_published = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.instructors'::regclass AND polname='Anon can view instructors') THEN
    CREATE POLICY "Anon can view instructors" ON public.instructors FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.modules'::regclass AND polname='Anon can view modules') THEN
    CREATE POLICY "Anon can view modules" ON public.modules FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.categories'::regclass AND polname='Anon can view categories') THEN
    CREATE POLICY "Anon can view categories" ON public.categories FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.tags'::regclass AND polname='Anon can view tags') THEN
    CREATE POLICY "Anon can view tags" ON public.tags FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.course_tags'::regclass AND polname='Anon can view course tags') THEN
    CREATE POLICY "Anon can view course tags" ON public.course_tags FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.reviews'::regclass AND polname='Anon can view approved reviews') THEN
    CREATE POLICY "Anon can view approved reviews" ON public.reviews FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.testimonials'::regclass AND polname='Anon can view testimonials') THEN
    CREATE POLICY "Anon can view testimonials" ON public.testimonials FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.learning_paths'::regclass AND polname='Anon can view paths') THEN
    CREATE POLICY "Anon can view paths" ON public.learning_paths FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.learning_path_courses'::regclass AND polname='Anon can view path courses') THEN
    CREATE POLICY "Anon can view path courses" ON public.learning_path_courses FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.brands'::regclass AND polname='Anon can view brands') THEN
    CREATE POLICY "Anon can view brands" ON public.brands FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.blog_posts'::regclass AND polname='Anon can view published posts') THEN
    CREATE POLICY "Anon can view published posts" ON public.blog_posts FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.cms_pages'::regclass AND polname='Anon can view cms pages') THEN
    CREATE POLICY "Anon can view cms pages" ON public.cms_pages FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.site_content'::regclass AND polname='Anon can view site content') THEN
    CREATE POLICY "Anon can view site content" ON public.site_content FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.pricing_plans'::regclass AND polname='Anon can view pricing plans') THEN
    CREATE POLICY "Anon can view pricing plans" ON public.pricing_plans FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.jobs'::regclass AND polname='Anon can view jobs') THEN
    CREATE POLICY "Anon can view jobs" ON public.jobs FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.page_seo'::regclass AND polname='Anon can view page seo') THEN
    CREATE POLICY "Anon can view page seo" ON public.page_seo FOR SELECT TO anon USING (true);
  END IF;
END$$;