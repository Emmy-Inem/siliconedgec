-- Create private bucket for job resume uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-resumes', 'job-resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder (folder name = user id)
CREATE POLICY "Users can upload own resume"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own resume"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-resumes'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update own resume"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'job-resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own resume"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-resumes'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Trigger: notify user when their job application status changes
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Application status updated',
      'Your application status changed to: ' || NEW.status,
      'info',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_status ON public.job_applications;
CREATE TRIGGER trg_notify_application_status
AFTER UPDATE ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_application_status_change();

-- Trigger: notify enrolled students when a course gets a new announcement
CREATE OR REPLACE FUNCTION public.notify_course_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT e.user_id,
         'New announcement: ' || NEW.title,
         LEFT(NEW.content, 200),
         'info',
         '/courses/' || NEW.course_id || '/learn'
  FROM public.enrollments e
  WHERE e.course_id = NEW.course_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_course_announcement ON public.course_announcements;
CREATE TRIGGER trg_notify_course_announcement
AFTER INSERT ON public.course_announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_course_announcement();