-- Create public bucket for site media (testimonial avatars, page images, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-media', 'site-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read
DROP POLICY IF EXISTS "Site media public read" ON storage.objects;
CREATE POLICY "Site media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-media');

-- Admins can upload/update/delete
DROP POLICY IF EXISTS "Admins can upload site media" ON storage.objects;
CREATE POLICY "Admins can upload site media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update site media" ON storage.objects;
CREATE POLICY "Admins can update site media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete site media" ON storage.objects;
CREATE POLICY "Admins can delete site media"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'::app_role));