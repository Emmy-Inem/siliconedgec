-- Bootcamp installment payments: cohorts, enrollments, payment events.

CREATE TABLE IF NOT EXISTS public.bootcamp_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  default_total_amount numeric NOT NULL DEFAULT 0,
  default_installments integer NOT NULL DEFAULT 4,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bootcamp_cohorts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bootcamp_cohorts TO authenticated;
GRANT ALL ON public.bootcamp_cohorts TO service_role;

ALTER TABLE public.bootcamp_cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bootcamp cohorts"
  ON public.bootcamp_cohorts FOR SELECT
  USING (is_active = true OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role]));

CREATE POLICY "Admins manage bootcamp cohorts"
  ON public.bootcamp_cohorts FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role]));

CREATE TRIGGER trg_bootcamp_cohorts_updated
  BEFORE UPDATE ON public.bootcamp_cohorts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bootcamp enrollments
CREATE TABLE IF NOT EXISTS public.bootcamp_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.bootcamp_cohorts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  reference text NOT NULL UNIQUE,
  total_amount numeric NOT NULL,
  installment_amount numeric NOT NULL,
  total_installments integer NOT NULL,
  installments_paid integer NOT NULL DEFAULT 0,
  installment_due_dates date[] NOT NULL,
  next_due_date date,
  paystack_page_id text,
  paystack_page_slug text,
  payment_link text NOT NULL,
  access_granted boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  last_payment_date timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, email)
);

CREATE INDEX IF NOT EXISTS bootcamp_enrollments_user_idx ON public.bootcamp_enrollments(user_id);
CREATE INDEX IF NOT EXISTS bootcamp_enrollments_email_idx ON public.bootcamp_enrollments(lower(email));
CREATE INDEX IF NOT EXISTS bootcamp_enrollments_status_idx ON public.bootcamp_enrollments(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bootcamp_enrollments TO authenticated;
GRANT ALL ON public.bootcamp_enrollments TO service_role;

ALTER TABLE public.bootcamp_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own bootcamp enrollment"
  ON public.bootcamp_enrollments FOR SELECT
  USING (
    auth.uid() = user_id
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email',''))
    OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role])
  );

CREATE POLICY "Admins manage bootcamp enrollments"
  ON public.bootcamp_enrollments FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role]));

CREATE TRIGGER trg_bootcamp_enrollments_updated
  BEFORE UPDATE ON public.bootcamp_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment events (idempotency)
CREATE TABLE IF NOT EXISTS public.bootcamp_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.bootcamp_enrollments(id) ON DELETE CASCADE,
  paystack_event_id text NOT NULL UNIQUE,
  paystack_reference text,
  amount numeric NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bootcamp_payment_events TO authenticated;
GRANT ALL ON public.bootcamp_payment_events TO service_role;

ALTER TABLE public.bootcamp_payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view bootcamp payment events"
  ON public.bootcamp_payment_events FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'finance'::app_role]));

-- Link bootcamp enrollment to user on signup by email match.
CREATE OR REPLACE FUNCTION public.link_bootcamp_enrollment_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bootcamp_enrollments
     SET user_id = NEW.id
   WHERE user_id IS NULL
     AND lower(email) = lower(NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_bootcamp ON auth.users;
CREATE TRIGGER on_auth_user_created_link_bootcamp
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_bootcamp_enrollment_on_signup();

-- Safety-net RPC the dashboard can call to claim an enrollment by email.
CREATE OR REPLACE FUNCTION public.claim_bootcamp_enrollment()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text := lower(COALESCE(auth.jwt()->>'email',''));
  v_count integer;
BEGIN
  IF v_user IS NULL OR v_email = '' THEN RETURN 0; END IF;
  UPDATE public.bootcamp_enrollments
     SET user_id = v_user
   WHERE user_id IS NULL AND lower(email) = v_email;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_bootcamp_enrollment() TO authenticated;