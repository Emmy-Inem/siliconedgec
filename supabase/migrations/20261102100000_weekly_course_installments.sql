ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration_weeks integer
  CHECK (duration_weeks BETWEEN 1 AND 104);

CREATE TABLE public.course_payment_agreements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL ,
 course_ids uuid[] NOT NULL, currency text NOT NULL, total_minor bigint NOT NULL CHECK(total_minor > 0),
 amount_paid_minor bigint NOT NULL DEFAULT 0, schedule jsonb NOT NULL,
 final_deadline timestamptz NOT NULL, terms_version text NOT NULL,
 accepted_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','completed','overdue'))
);
CREATE TABLE public.course_payment_installments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agreement_id uuid NOT NULL REFERENCES public.course_payment_agreements(id),
 number integer NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor > 0), due_at timestamptz NOT NULL,
 reference text NOT NULL UNIQUE DEFAULT ('SEC-INST-' || gen_random_uuid()::text),
 gateway text NOT NULL CHECK(gateway IN ('stripe','paystack')), provider_id text,
 authorization_url text, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')),
 paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(agreement_id,number)
);
ALTER TABLE public.course_payment_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_payment_installments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.course_payment_agreements, public.course_payment_installments TO authenticated;
GRANT ALL ON public.course_payment_agreements, public.course_payment_installments TO service_role;
CREATE POLICY "Own payment agreements" ON public.course_payment_agreements FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "Own installment payments" ON public.course_payment_installments FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.course_payment_agreements a WHERE a.id=agreement_id AND a.user_id=auth.uid()));

CREATE FUNCTION public.create_course_payment_agreement(p_user_id uuid,p_course_ids uuid[],p_currency text,p_total_minor bigint,p_schedule jsonb,p_deadline timestamptz,p_terms_version text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 IF EXISTS(SELECT 1 FROM public.course_payment_agreements WHERE user_id=p_user_id AND course_ids && p_course_ids AND status IN ('pending','active','overdue')) THEN
 RAISE EXCEPTION 'Payment agreement already exists'; END IF;
 INSERT INTO public.course_payment_agreements(user_id,course_ids,currency,total_minor,schedule,final_deadline,terms_version)
 VALUES(p_user_id,p_course_ids,p_currency,p_total_minor,p_schedule,p_deadline,p_terms_version) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_course_payment_agreement(uuid,uuid[],text,bigint,jsonb,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_course_payment_agreement(uuid,uuid[],text,bigint,jsonb,timestamptz,text) TO service_role;

-- Settlement is called only after checking the provider's paid amount, currency and reference.
CREATE FUNCTION public.settle_course_installment(p_payment_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.course_payment_installments; a public.course_payment_agreements; paid bigint; cid uuid;
BEGIN
 SELECT * INTO p FROM public.course_payment_installments WHERE id=p_payment_id FOR UPDATE;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Payment missing'; END IF;
 IF p.status='paid' THEN RETURN; END IF;
 SELECT * INTO a FROM public.course_payment_agreements WHERE id=p.agreement_id FOR UPDATE;
 UPDATE public.course_payment_installments SET status='paid',paid_at=now() WHERE id=p.id;
 SELECT COALESCE(sum(amount_minor),0) INTO paid FROM public.course_payment_installments WHERE agreement_id=a.id AND status='paid';
 UPDATE public.course_payment_agreements SET amount_paid_minor=paid,
 status=CASE WHEN paid>=total_minor THEN 'completed' WHEN now()>=final_deadline THEN 'overdue' ELSE 'active' END WHERE id=a.id;
 FOREACH cid IN ARRAY a.course_ids LOOP
   INSERT INTO public.enrollments(user_id,course_id,payment_status,access_expires_at)
   VALUES(a.user_id,cid,'confirmed',CASE WHEN paid>=a.total_minor THEN NULL ELSE a.final_deadline END)
   ON CONFLICT(user_id,course_id) DO UPDATE SET payment_status='confirmed',
   access_expires_at=CASE WHEN paid>=a.total_minor THEN NULL ELSE a.final_deadline END;
 END LOOP;
 IF paid>=a.total_minor THEN
 INSERT INTO public.certificates(user_id,course_id,verification_code)
 SELECT e.user_id,e.course_id,upper(substring(replace(gen_random_uuid()::text,'-',''),1,12)) FROM public.enrollments e
 WHERE e.user_id=a.user_id AND e.course_id=ANY(a.course_ids) AND e.is_completed=true
 ON CONFLICT(user_id,course_id) DO NOTHING;
 END IF;
 DELETE FROM public.cart_items WHERE user_id=a.user_id AND course_id=ANY(a.course_ids);
END $$;
REVOKE ALL ON FUNCTION public.settle_course_installment(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_course_installment(uuid) TO service_role;

-- Guard every existing access path, including cohort membership, at the database boundary.
CREATE OR REPLACE FUNCTION public.user_can_access_course(_course_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT
    CASE
      WHEN _user_id IS NULL THEN false
      WHEN public.has_any_role(_user_id, ARRAY['admin'::app_role,'moderator'::app_role,'instructor'::app_role]) THEN true
      WHEN EXISTS (SELECT 1 FROM public.course_payment_agreements a WHERE a.user_id=_user_id AND _course_id=ANY(a.course_ids) AND a.amount_paid_minor>0 AND a.amount_paid_minor<a.total_minor AND now()>=a.final_deadline) THEN false
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

-- Withhold certificates even if all lessons were completed before the final balance was paid.
CREATE FUNCTION public.check_installment_certificate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.course_payment_agreements a WHERE a.user_id=NEW.user_id
 AND NEW.course_id=ANY(a.course_ids) AND a.amount_paid_minor>0 AND a.amount_paid_minor<a.total_minor) THEN
   RETURN NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_check_installment_certificate BEFORE INSERT ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.check_installment_certificate();

CREATE FUNCTION public.expire_course_installments() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.course_payment_agreements SET status='overdue' WHERE status='active' AND final_deadline<=now() AND amount_paid_minor<total_minor;
 INSERT INTO public.notifications(user_id,title,message,type,link)
 SELECT a.user_id,'Weekly course payment due',
 'Plan ' || a.id::text || ': installment ' || (due->>'number') || ' is due on ' || (due->>'due_at') || '. View your plan to pay.','info','/flexible-payments'
 FROM public.course_payment_agreements a CROSS JOIN LATERAL jsonb_array_elements(a.schedule) due
 WHERE a.status='active' AND (due->>'due_at')::timestamptz BETWEEN now() AND now()+interval '3 days'
 AND NOT EXISTS(SELECT 1 FROM public.course_payment_installments p WHERE p.agreement_id=a.id AND p.number=(due->>'number')::integer AND p.status='paid')
 AND NOT EXISTS(SELECT 1 FROM public.notifications n WHERE n.user_id=a.user_id AND n.title='Weekly course payment due'
 AND n.message='Plan ' || a.id::text || ': installment ' || (due->>'number') || ' is due on ' || (due->>'due_at') || '. View your plan to pay.');
 INSERT INTO public.notifications(user_id,title,message,type,link)
 SELECT a.user_id,'Final course payment deadline passed','Your course access is suspended and your certificate is withheld until the balance is paid.','warning','/flexible-payments'
 FROM public.course_payment_agreements a WHERE a.status='overdue' AND NOT EXISTS(
 SELECT 1 FROM public.notifications n WHERE n.user_id=a.user_id AND n.title='Final course payment deadline passed' AND n.created_at>=a.final_deadline);
END $$;
REVOKE ALL ON FUNCTION public.expire_course_installments() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_course_installments() TO service_role;
SELECT cron.schedule('expire-course-installments','5 6 * * *','SELECT public.expire_course_installments()');
