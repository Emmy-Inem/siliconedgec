-- Create storage bucket for course thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-thumbnails', 'course-thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Allow anyone to view course thumbnails
CREATE POLICY "Public read access for course thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-thumbnails');

-- Allow admins to upload/update/delete course thumbnails
CREATE POLICY "Admins can upload course thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update course thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete course thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'admin'));