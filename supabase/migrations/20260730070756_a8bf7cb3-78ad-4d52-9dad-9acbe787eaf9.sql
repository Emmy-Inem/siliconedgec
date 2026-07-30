
-- ============ 1. INSTALLMENT / PART PAYMENTS ============
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS public.installment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  total_installments integer NOT NULL DEFAULT 2,
  installments_paid integer NOT NULL DEFAULT 0,
  next_due_date date,
  final_due_date date,
  access_expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT ON public.installment_plans TO authenticated;
GRANT ALL ON public.installment_plans TO service_role;
ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners view own installment plans" ON public.installment_plans
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff manage installment plans" ON public.installment_plans
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]));
CREATE TRIGGER trg_installment_plans_updated BEFORE UPDATE ON public.installment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.installment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.installment_plans(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  reference text,
  method text,
  recorded_by uuid,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.installment_payments TO authenticated;
GRANT ALL ON public.installment_payments TO service_role;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners view own installment payments" ON public.installment_payments
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.installment_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Staff manage installment payments" ON public.installment_payments
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]));

-- access gate now respects the expiry window
CREATE OR REPLACE FUNCTION public.user_can_access_course(_course_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT
    CASE
      WHEN _user_id IS NULL THEN false
      WHEN public.has_any_role(_user_id, ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN true
      WHEN EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.cohort_only = true)
        THEN EXISTS (
          SELECT 1 FROM public.cohort_members cm
          JOIN public.cohorts co ON co.id = cm.cohort_id
          WHERE co.course_id = _course_id AND cm.user_id = _user_id
        )
      ELSE EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.course_id = _course_id AND e.user_id = _user_id
          AND (e.access_expires_at IS NULL OR e.access_expires_at > now())
          AND (
            COALESCE(e.payment_status,'pending') IN ('paid','success','completed','confirmed','granted')
            OR e.access_source IN ('manual_grant','promo','bootcamp')
          )
      )
    END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_installment_plan(
  p_user_id uuid, p_course_id uuid, p_total_amount numeric,
  p_total_installments integer, p_first_payment numeric,
  p_access_days integer, p_next_due date, p_note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_id uuid; v_expiry timestamptz;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]) THEN
    RAISE EXCEPTION 'Only admin or finance staff can create installment plans'
      USING ERRCODE='insufficient_privilege';
  END IF;
  v_expiry := now() + make_interval(days => GREATEST(COALESCE(p_access_days,30),1));

  INSERT INTO public.installment_plans (
    user_id, course_id, total_amount, amount_paid, total_installments,
    installments_paid, next_due_date, access_expires_at, status, note, created_by)
  VALUES (p_user_id, p_course_id, p_total_amount, COALESCE(p_first_payment,0),
          GREATEST(COALESCE(p_total_installments,2),1),
          CASE WHEN COALESCE(p_first_payment,0) > 0 THEN 1 ELSE 0 END,
          p_next_due, v_expiry, 'active', p_note, auth.uid())
  ON CONFLICT (user_id, course_id) DO UPDATE
    SET total_amount = EXCLUDED.total_amount,
        total_installments = EXCLUDED.total_installments,
        next_due_date = EXCLUDED.next_due_date,
        access_expires_at = EXCLUDED.access_expires_at,
        status = 'active',
        note = EXCLUDED.note
  RETURNING id INTO v_id;

  IF COALESCE(p_first_payment,0) > 0 THEN
    INSERT INTO public.installment_payments (plan_id, amount, method, recorded_by)
    VALUES (v_id, p_first_payment, 'manual', auth.uid());
  END IF;

  PERFORM set_config('role', 'service_role', true);
  INSERT INTO public.enrollments (user_id, course_id, payment_status, access_source, access_expires_at)
  VALUES (p_user_id, p_course_id, 'granted', 'manual_grant', v_expiry)
  ON CONFLICT (user_id, course_id) DO UPDATE
    SET payment_status = 'granted', access_source = 'manual_grant', access_expires_at = v_expiry;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p_user_id, 'Installment plan activated',
          'Your part-payment plan is active. Access runs until ' || to_char(v_expiry,'DD Mon YYYY') || '.',
          'info', '/dashboard');
  RETURN v_id;
END $function$;

CREATE OR REPLACE FUNCTION public.admin_record_installment_payment(
  p_plan_id uuid, p_amount numeric, p_reference text DEFAULT NULL,
  p_extend_days integer DEFAULT 30, p_next_due date DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE p record; v_paid numeric; v_complete boolean; v_expiry timestamptz;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]) THEN
    RAISE EXCEPTION 'Only admin or finance staff can record installment payments'
      USING ERRCODE='insufficient_privilege';
  END IF;
  SELECT * INTO p FROM public.installment_plans WHERE id = p_plan_id;
  IF p IS NULL THEN RAISE EXCEPTION 'Plan not found'; END IF;

  v_paid := COALESCE(p.amount_paid,0) + COALESCE(p_amount,0);
  v_complete := p.total_amount > 0 AND v_paid + 0.5 >= p.total_amount;
  v_expiry := CASE WHEN v_complete THEN NULL
                   ELSE GREATEST(now(), COALESCE(p.access_expires_at, now()))
                        + make_interval(days => GREATEST(COALESCE(p_extend_days,30),1)) END;

  INSERT INTO public.installment_payments (plan_id, amount, reference, method, recorded_by)
  VALUES (p_plan_id, p_amount, p_reference, 'manual', auth.uid());

  UPDATE public.installment_plans
     SET amount_paid = v_paid,
         installments_paid = installments_paid + 1,
         next_due_date = CASE WHEN v_complete THEN NULL ELSE COALESCE(p_next_due, next_due_date) END,
         access_expires_at = v_expiry,
         status = CASE WHEN v_complete THEN 'completed' ELSE 'active' END
   WHERE id = p_plan_id;

  PERFORM set_config('role', 'service_role', true);
  UPDATE public.enrollments
     SET access_expires_at = v_expiry,
         payment_status = CASE WHEN v_complete THEN 'paid' ELSE payment_status END
   WHERE user_id = p.user_id AND course_id = p.course_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p.user_id,
          CASE WHEN v_complete THEN 'Payment complete' ELSE 'Part payment received' END,
          CASE WHEN v_complete THEN 'Your course is fully paid — access is now permanent.'
               ELSE 'We received your payment. Access extended to ' || to_char(v_expiry,'DD Mon YYYY') || '.' END,
          'success', '/dashboard');
END $function$;

CREATE OR REPLACE FUNCTION public.expire_overdue_installments()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE n integer := 0; r record;
BEGIN
  FOR r IN
    SELECT * FROM public.installment_plans
    WHERE status = 'active' AND access_expires_at IS NOT NULL AND access_expires_at <= now()
  LOOP
    UPDATE public.installment_plans SET status = 'defaulted' WHERE id = r.id;
    UPDATE public.enrollments SET access_expires_at = r.access_expires_at
     WHERE user_id = r.user_id AND course_id = r.course_id;
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (r.user_id, 'Course access paused',
            'Your part-payment window has ended. Complete your balance to restore access.',
            'warning', '/dashboard');
    n := n + 1;
  END LOOP;
  RETURN n;
END $function$;

-- ============ 2. AFFILIATES ============
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';

CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  code text NOT NULL UNIQUE,
  audience text,
  channels text,
  commission_percentage numeric NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'pending',
  payout_method text,
  payout_details text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.affiliates TO anon;
GRANT SELECT, INSERT, UPDATE ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can apply as affiliate" ON public.affiliates
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');
CREATE POLICY "Affiliates view own record" ON public.affiliates
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Affiliates update own payout details" ON public.affiliates
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff manage affiliates" ON public.affiliates
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]));
CREATE TRIGGER trg_affiliates_updated BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  landing_path text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.affiliate_clicks TO anon;
GRANT SELECT, INSERT ON public.affiliate_clicks TO authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log an affiliate click" ON public.affiliate_clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Affiliates view own clicks" ON public.affiliate_clicks
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Staff view affiliate clicks" ON public.affiliate_clicks
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]));

CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  user_id uuid,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  order_id uuid,
  conversion_type text NOT NULL DEFAULT 'signup',
  amount numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view own referrals" ON public.affiliate_referrals
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Staff manage affiliate referrals" ON public.affiliate_referrals
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]));
CREATE TRIGGER trg_affiliate_referrals_updated BEFORE UPDATE ON public.affiliate_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reference text,
  note text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view own payouts" ON public.affiliate_payouts
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Staff manage affiliate payouts" ON public.affiliate_payouts
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'finance'::app_role]));
CREATE TRIGGER trg_affiliate_payouts_updated BEFORE UPDATE ON public.affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.resolve_affiliate_code(p_code text)
RETURNS TABLE(id uuid, full_name text, code text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT a.id, a.full_name, a.code, a.status
  FROM public.affiliates a
  WHERE lower(a.code) = lower(p_code) AND a.status = 'approved'
  LIMIT 1;
$function$;

-- ============ 3. SECURITY FIXES ============
DROP POLICY IF EXISTS "Authenticated can view reviews" ON public.reviews;
CREATE POLICY "Users view own review" ON public.reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff view all reviews" ON public.reviews
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role]));

DROP POLICY IF EXISTS "students read own assignment files" ON storage.objects;
DROP POLICY IF EXISTS "students upload own assignment files" ON storage.objects;
CREATE POLICY "students read own assignment files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'assignment-submissions'
         AND (auth.uid()::text = (storage.foldername(name))[1]
              OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role])));
CREATE POLICY "students upload own assignment files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assignment-submissions'
              AND auth.uid()::text = (storage.foldername(name))[1]);
