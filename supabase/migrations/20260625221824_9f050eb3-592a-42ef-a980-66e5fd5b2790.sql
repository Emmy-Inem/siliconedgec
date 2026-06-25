
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  route text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, route)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authed reads role permissions" ON public.role_permissions;
CREATE POLICY "Anyone authed reads role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins manage role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.role_can_access(_role public.app_role, _route text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT allowed FROM public.role_permissions WHERE role = _role AND route = _route),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.role_can_access(public.app_role, text) TO authenticated, service_role;

INSERT INTO public.role_permissions (role, route, allowed) VALUES
  ('moderator'::public.app_role, '/admin', true),
  ('moderator'::public.app_role, '/admin/analytics', true),
  ('moderator'::public.app_role, '/admin/courses', true),
  ('moderator'::public.app_role, '/admin/categories', true),
  ('moderator'::public.app_role, '/admin/tags', true),
  ('moderator'::public.app_role, '/admin/paths', true),
  ('moderator'::public.app_role, '/admin/students', true),
  ('moderator'::public.app_role, '/admin/enrollments', true),
  ('moderator'::public.app_role, '/admin/quizzes', true),
  ('moderator'::public.app_role, '/admin/quiz-attempts', true),
  ('moderator'::public.app_role, '/admin/qna', true),
  ('moderator'::public.app_role, '/admin/announcements', true),
  ('moderator'::public.app_role, '/admin/testimonials', true),
  ('moderator'::public.app_role, '/admin/instructors', true),
  ('moderator'::public.app_role, '/admin/live-classes', true),
  ('moderator'::public.app_role, '/admin/assessments', true),
  ('moderator'::public.app_role, '/admin/people', true),
  ('moderator'::public.app_role, '/admin/communication', true),
  ('moderator'::public.app_role, '/admin/content-hub', true),
  ('instructor'::public.app_role, '/admin', true),
  ('instructor'::public.app_role, '/admin/courses', true),
  ('instructor'::public.app_role, '/admin/assessments', true),
  ('instructor'::public.app_role, '/admin/quizzes', true),
  ('instructor'::public.app_role, '/admin/quiz-attempts', true),
  ('instructor'::public.app_role, '/admin/qna', true),
  ('instructor'::public.app_role, '/admin/students', true),
  ('instructor'::public.app_role, '/admin/live-classes', true),
  ('instructor'::public.app_role, '/admin/announcements', true),
  ('instructor'::public.app_role, '/admin/people', true),
  ('support'::public.app_role, '/admin', true),
  ('support'::public.app_role, '/admin/chat', true),
  ('support'::public.app_role, '/admin/leads-hub', true),
  ('support'::public.app_role, '/admin/business-leads', true),
  ('support'::public.app_role, '/admin/registrations', true),
  ('support'::public.app_role, '/admin/qna', true),
  ('support'::public.app_role, '/admin/communication', true),
  ('support'::public.app_role, '/admin/notifications', true),
  ('finance'::public.app_role, '/admin', true),
  ('finance'::public.app_role, '/admin/analytics', true),
  ('finance'::public.app_role, '/admin/commerce', true),
  ('finance'::public.app_role, '/admin/orders', true),
  ('finance'::public.app_role, '/admin/pricing', true),
  ('finance'::public.app_role, '/admin/influencers-marketing', true),
  ('finance'::public.app_role, '/admin/finance', true),
  ('finance'::public.app_role, '/admin/marketing', true),
  ('content_editor'::public.app_role, '/admin', true),
  ('content_editor'::public.app_role, '/admin/content-hub', true),
  ('content_editor'::public.app_role, '/admin/seo', true),
  ('content_editor'::public.app_role, '/admin/media', true),
  ('content_editor'::public.app_role, '/admin/testimonials', true),
  ('content_editor'::public.app_role, '/admin/home-content', true),
  ('content_editor'::public.app_role, '/admin/content', true)
ON CONFLICT (role, route) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.finance_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  reason text,
  status text NOT NULL DEFAULT 'pending',
  provider_reference text,
  notes text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_refunds TO authenticated;
GRANT ALL ON public.finance_refunds TO service_role;
ALTER TABLE public.finance_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finance team manages refunds" ON public.finance_refunds;
CREATE POLICY "Finance team manages refunds"
  ON public.finance_refunds FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','finance']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','finance']::public.app_role[]));

CREATE INDEX IF NOT EXISTS idx_finance_refunds_order ON public.finance_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_finance_refunds_status ON public.finance_refunds(status);

DROP TRIGGER IF EXISTS trg_finance_refunds_updated_at ON public.finance_refunds;
CREATE TRIGGER trg_finance_refunds_updated_at
  BEFORE UPDATE ON public.finance_refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.finance_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_user_id uuid,
  payee_name text NOT NULL,
  payee_type text NOT NULL DEFAULT 'instructor',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  period_start date,
  period_end date,
  method text,
  status text NOT NULL DEFAULT 'pending',
  reference text,
  notes text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_payouts TO authenticated;
GRANT ALL ON public.finance_payouts TO service_role;
ALTER TABLE public.finance_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finance team manages payouts" ON public.finance_payouts;
CREATE POLICY "Finance team manages payouts"
  ON public.finance_payouts FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','finance']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','finance']::public.app_role[]));

CREATE INDEX IF NOT EXISTS idx_finance_payouts_status ON public.finance_payouts(status);
CREATE INDEX IF NOT EXISTS idx_finance_payouts_payee ON public.finance_payouts(payee_user_id);

DROP TRIGGER IF EXISTS trg_finance_payouts_updated_at ON public.finance_payouts;
CREATE TRIGGER trg_finance_payouts_updated_at
  BEFORE UPDATE ON public.finance_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
