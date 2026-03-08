
-- Fix courses policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Published courses viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;

CREATE POLICY "Published courses viewable by everyone"
  ON public.courses FOR SELECT
  USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix modules policies
DROP POLICY IF EXISTS "Modules viewable by everyone" ON public.modules;
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;

CREATE POLICY "Modules viewable by everyone"
  ON public.modules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage modules"
  ON public.modules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix lessons policies
DROP POLICY IF EXISTS "Lessons viewable by everyone" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;

CREATE POLICY "Lessons viewable by everyone"
  ON public.lessons FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage lessons"
  ON public.lessons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix instructors policies
DROP POLICY IF EXISTS "Instructors viewable by everyone" ON public.instructors;
DROP POLICY IF EXISTS "Admins can manage instructors" ON public.instructors;

CREATE POLICY "Instructors viewable by everyone"
  ON public.instructors FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage instructors"
  ON public.instructors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix testimonials policies
DROP POLICY IF EXISTS "Testimonials viewable by everyone" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;

CREATE POLICY "Testimonials viewable by everyone"
  ON public.testimonials FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage testimonials"
  ON public.testimonials FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix pricing_plans policies
DROP POLICY IF EXISTS "Pricing plans viewable by everyone" ON public.pricing_plans;
DROP POLICY IF EXISTS "Admins can manage pricing plans" ON public.pricing_plans;

CREATE POLICY "Pricing plans viewable by everyone"
  ON public.pricing_plans FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage pricing plans"
  ON public.pricing_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix site_content policies
DROP POLICY IF EXISTS "Site content viewable by everyone" ON public.site_content;
DROP POLICY IF EXISTS "Admins can manage site content" ON public.site_content;

CREATE POLICY "Site content viewable by everyone"
  ON public.site_content FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage site content"
  ON public.site_content FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles policies
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Fix enrollments policies
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.enrollments;

CREATE POLICY "Users can view own enrollments"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrollments"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments"
  ON public.enrollments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage enrollments"
  ON public.enrollments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
