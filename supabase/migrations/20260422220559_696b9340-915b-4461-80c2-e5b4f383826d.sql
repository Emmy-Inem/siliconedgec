
-- Brands
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brands viewable by everyone when published" ON public.brands FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins manage brands" ON public.brands FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Blog Posts
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  featured_image_url TEXT,
  author_id UUID,
  author_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published posts viewable by everyone" ON public.blog_posts FOR SELECT USING (status = 'published' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins manage blog posts" ON public.blog_posts FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);

-- Media Library
CREATE TABLE public.media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  alt_text TEXT,
  uploaded_by UUID,
  folder TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage media" ON public.media_library FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- CMS Pages
CREATE TABLE public.cms_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  meta_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  show_in_footer BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published pages viewable by everyone" ON public.cms_pages FOR SELECT USING (status = 'published' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Admins manage cms pages" ON public.cms_pages FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Update triggers
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cms_pages_updated_at BEFORE UPDATE ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed essential CMS pages
INSERT INTO public.cms_pages (title, slug, content, status, show_in_footer, order_index) VALUES
('About Us', 'about', '# About Silicon Edge Consulting\n\nWe build job-ready tech talent across Africa.', 'published', true, 1),
('Privacy Policy', 'privacy', '# Privacy Policy\n\nYour privacy matters. Update this content from the admin panel.', 'published', true, 2),
('Terms of Service', 'terms', '# Terms of Service\n\nUpdate these terms from the admin panel.', 'published', true, 3),
('Refund Policy', 'refund', '# Refund Policy\n\nUpdate this policy from the admin panel.', 'published', true, 4);

-- Seed default brands placeholder
INSERT INTO public.brands (name, slug, order_index, is_published) VALUES
('AWS', 'aws', 1, true),
('Microsoft Azure', 'azure', 2, true),
('Google Cloud', 'gcp', 3, true),
('Kubernetes', 'kubernetes', 4, true),
('Docker', 'docker', 5, true);

-- WhatsApp community link site_content key (placeholder)
INSERT INTO public.site_content (key, value, content_type) VALUES
('whatsapp_community_url', 'https://chat.whatsapp.com/your-community-link', 'setting')
ON CONFLICT DO NOTHING;
