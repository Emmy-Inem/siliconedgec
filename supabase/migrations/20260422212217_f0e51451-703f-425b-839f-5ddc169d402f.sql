
-- 1. Seed Categories (idempotent via slug uniqueness)
INSERT INTO public.categories (name, slug, description, order_index) VALUES
  ('Cloud Engineering', 'cloud-engineering', 'AWS, Azure, GCP and modern cloud infrastructure', 1),
  ('DevOps', 'devops', 'CI/CD, Kubernetes, Docker, automation', 2),
  ('Software Engineering', 'software-engineering', 'Backend, system design, architecture', 3),
  ('AI / Machine Learning', 'ai-machine-learning', 'AI, ML, deep learning, LLMs', 4),
  ('Cybersecurity', 'cybersecurity', 'Security fundamentals, ethical hacking, SOC', 5),
  ('Data Science', 'data-science', 'Analytics, data engineering, visualization', 6),
  ('Web Development', 'web-development', 'Frontend, full-stack, frameworks', 7),
  ('Programming Languages', 'programming-languages', 'Python, JavaScript, TypeScript and more', 8),
  ('UI/UX Design', 'ui-ux-design', 'Product design, user experience, prototyping', 9),
  ('Free Webinars', 'free-webinars', 'Free live webinars and intro sessions', 10)
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed Tags
INSERT INTO public.tags (name, slug) VALUES
  ('AWS','aws'),('Azure','azure'),('GCP','gcp'),('Kubernetes','kubernetes'),
  ('Docker','docker'),('Python','python'),('JavaScript','javascript'),
  ('TypeScript','typescript'),('React','react'),('Angular','angular'),
  ('GraphQL','graphql'),('CSS','css'),('Gatsby','gatsby'),('Node.js','nodejs'),
  ('Beginner-Friendly','beginner-friendly'),('Bootcamp','bootcamp'),
  ('Hands-On Labs','hands-on-labs'),('Career-Ready','career-ready'),
  ('Certificate','certificate'),('Free','free')
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed Learning Paths
INSERT INTO public.learning_paths (title, description, is_published, order_index) VALUES
  ('Cloud Engineer Track', 'Become a job-ready cloud engineer mastering AWS, Azure, and modern infrastructure.', true, 1),
  ('Full-Stack Web Developer Track', 'Master frontend and backend development with JavaScript, React, and modern frameworks.', true, 2),
  ('Python Developer Track', 'From Python fundamentals to advanced applications including APIs and data work.', true, 3)
ON CONFLICT DO NOTHING;

-- 4. Add slug column to promo_codes
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_promo_codes_slug ON public.promo_codes(slug);

-- 5. Create course_registrations table
CREATE TABLE IF NOT EXISTS public.course_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  user_id UUID,
  registration_type TEXT NOT NULL DEFAULT 'webinar', -- 'webinar' | 'enrollment'
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp_number TEXT,
  country TEXT,
  profession TEXT,
  experience_level TEXT,
  how_did_you_hear TEXT,
  motivation TEXT,
  goal TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | contacted | follow-up | converted
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit registrations"
  ON public.course_registrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage registrations"
  ON public.course_registrations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own registrations"
  ON public.course_registrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_course_registrations_updated_at
  BEFORE UPDATE ON public.course_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_course_registrations_course ON public.course_registrations(course_id);
CREATE INDEX IF NOT EXISTS idx_course_registrations_created ON public.course_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_registrations_status ON public.course_registrations(status);

-- 6. Seed site_content placeholders for contact info (only insert if missing)
INSERT INTO public.site_content (key, value, content_type) VALUES
  ('contact_phone', 'UPDATE IN ADMIN SETTINGS', 'setting'),
  ('contact_whatsapp', 'UPDATE IN ADMIN SETTINGS', 'setting'),
  ('contact_email', 'info@siliconedgec.com', 'setting'),
  ('contact_address', 'UPDATE IN ADMIN SETTINGS', 'setting'),
  ('whatsapp_number', 'UPDATE IN ADMIN SETTINGS', 'setting')
ON CONFLICT (key) DO NOTHING;
