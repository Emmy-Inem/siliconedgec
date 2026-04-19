
-- ============ ORDERS TABLE ============
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  paystack_reference TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending',
  promo_code_id UUID,
  discount_amount NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage orders"
  ON public.orders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_reference ON public.orders(reference);
CREATE INDEX idx_orders_status ON public.orders(status);

-- ============ LESSON RESOURCES TABLE ============
CREATE TABLE public.lesson_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL,
  course_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT,
  file_size BIGINT DEFAULT 0,
  file_type TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view lesson resources"
  ON public.lesson_resources FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = lesson_resources.course_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage lesson resources"
  ON public.lesson_resources FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_lesson_resources_lesson ON public.lesson_resources(lesson_id);
CREATE INDEX idx_lesson_resources_course ON public.lesson_resources(course_id);

-- ============ CERTIFICATES TABLE ============
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  verification_code TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can verify certificate by code"
  ON public.certificates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage certificates"
  ON public.certificates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_certificates_user ON public.certificates(user_id);
CREATE INDEX idx_certificates_code ON public.certificates(verification_code);
CREATE UNIQUE INDEX idx_certificates_unique_user_course ON public.certificates(user_id, course_id);

-- ============ AUTO-ISSUE CERTIFICATE TRIGGER ============
CREATE OR REPLACE FUNCTION public.issue_certificate_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed IS DISTINCT FROM true) THEN
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));
    INSERT INTO public.certificates (user_id, course_id, verification_code)
    VALUES (NEW.user_id, NEW.course_id, v_code)
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_issue_certificate
  AFTER INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.issue_certificate_on_completion();

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-resources', 'course-resources', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can manage course resources storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'course-resources' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enrolled users can read course resources"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'course-resources'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.lesson_resources lr
        JOIN public.enrollments e ON e.course_id = lr.course_id
        WHERE lr.file_path = storage.objects.name
          AND e.user_id = auth.uid()
      )
    )
  );
