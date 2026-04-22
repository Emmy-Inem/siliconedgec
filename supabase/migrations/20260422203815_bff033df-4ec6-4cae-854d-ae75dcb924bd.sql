-- Live Classes table
CREATE TABLE public.live_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  meeting_url TEXT NOT NULL,
  meeting_provider TEXT NOT NULL DEFAULT 'zoom',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  instructor_name TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage live classes" ON public.live_classes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enrolled users can view live classes" ON public.live_classes
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = live_classes.course_id AND e.user_id = auth.uid()
    )
  );

CREATE TRIGGER live_classes_updated_at
  BEFORE UPDATE ON public.live_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_live_classes_course ON public.live_classes(course_id, scheduled_at);

-- Add notes column to enrollments for instructor private notes (already covered, skipping)
-- Add new column to business_leads for internal notes/contact log
ALTER TABLE public.business_leads ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.business_leads ADD COLUMN IF NOT EXISTS assigned_to UUID;