ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS flexible_scheduling boolean NOT NULL DEFAULT false;
-- duration_hours is the existing canonical total-hours field; do not duplicate it.
COMMENT ON COLUMN public.courses.start_date IS 'Published course start date; null means not yet announced';
COMMENT ON COLUMN public.courses.flexible_scheduling IS 'Whether this course offers flexible scheduling';

CREATE TABLE public.checkout_terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL ,
  version text NOT NULL,
  course_ids jsonb NOT NULL,
  currency text NOT NULL,
  payment_option text NOT NULL CHECK (payment_option IN ('full', 'installments')),
  accepted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.checkout_terms_acceptances ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.checkout_terms_acceptances TO authenticated;
GRANT ALL ON public.checkout_terms_acceptances TO service_role;
CREATE POLICY "Read own checkout acceptance" ON public.checkout_terms_acceptances
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Only the authenticated checkout service records acceptance; clients cannot forge timestamps.
