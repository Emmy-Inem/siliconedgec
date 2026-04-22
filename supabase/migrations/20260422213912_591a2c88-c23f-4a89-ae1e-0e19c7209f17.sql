-- 1) Registration notes: timeline of follow-up actions
CREATE TABLE IF NOT EXISTS public.registration_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.course_registrations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.registration_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage registration notes"
  ON public.registration_notes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_reg_notes_registration ON public.registration_notes(registration_id);

-- 2) Page SEO settings
CREATE TABLE IF NOT EXISTS public.page_seo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  keywords TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  no_index BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.page_seo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Page SEO viewable by everyone"
  ON public.page_seo FOR SELECT USING (true);
CREATE POLICY "Admins manage page SEO"
  ON public.page_seo FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_page_seo_updated
  BEFORE UPDATE ON public.page_seo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.page_seo (path, title, description) VALUES
  ('/', 'Silicon Edge — Job-Ready IT Training', 'Instructor-led bootcamps in Cloud, DevOps, AI, Cybersecurity. Earn verifiable certificates and land tech roles.'),
  ('/courses', 'Browse Courses — Silicon Edge', 'Explore our catalog of cloud, DevOps, AI and web development courses with hands-on labs.'),
  ('/pricing', 'Pricing Plans — Silicon Edge', 'Affordable Naira-denominated training plans for individuals and teams.'),
  ('/certificates', 'Verifiable Certificates — Silicon Edge', 'Earn QR-coded certificates that employers can validate.'),
  ('/for-businesses', 'Corporate Training — Silicon Edge', 'Upskill your engineering teams with custom corporate training programs.'),
  ('/jobs', 'Tech Jobs Board — Silicon Edge', 'Find your next role. Apply to vetted tech opportunities for our graduates.')
ON CONFLICT (path) DO NOTHING;

-- 3) User activity log (per-user actions, distinct from admin_activity_log)
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view all user activity"
  ON public.user_activity_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can insert activity"
  ON public.user_activity_log FOR INSERT
  WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON public.user_activity_log(created_at DESC);