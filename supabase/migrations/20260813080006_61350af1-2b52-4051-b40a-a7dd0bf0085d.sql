-- ============ AFFILIATE REFERRAL ATTRIBUTION ============
CREATE OR REPLACE FUNCTION public.record_affiliate_referral(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  v_code text;
  v_aff public.affiliates%ROWTYPE;
  v_pct numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND OR o.status <> 'completed' THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.affiliate_referrals WHERE order_id = o.id) THEN RETURN; END IF;

  v_code := nullif(trim(coalesce(o.metadata->>'affiliate_code', o.metadata->>'ref', '')), '');
  IF v_code IS NULL THEN RETURN; END IF;

  SELECT a.* INTO v_aff FROM public.affiliates a WHERE lower(a.code) = lower(v_code) AND a.status = 'approved';
  IF NOT FOUND THEN
    SELECT a.* INTO v_aff
    FROM public.affiliate_course_selections s
    JOIN public.affiliates a ON a.id = s.affiliate_id
    WHERE lower(s.referral_code) = lower(v_code) AND a.status = 'approved'
    LIMIT 1;
  END IF;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT coalesce(
    (SELECT s.commission_percentage FROM public.affiliate_course_selections s
      WHERE s.affiliate_id = v_aff.id AND s.course_id = o.course_id AND s.status = 'approved' LIMIT 1),
    v_aff.commission_percentage, 10) INTO v_pct;

  INSERT INTO public.affiliate_referrals (affiliate_id, user_id, course_id, order_id, conversion_type, amount, commission, status)
  VALUES (v_aff.id, o.user_id, o.course_id, o.id, 'purchase', coalesce(o.amount,0), round(coalesce(o.amount,0) * v_pct / 100.0, 2), 'pending');

  PERFORM public.queue_automation(v_aff.user_id, 'affiliate_conversion', o.id::text,
    jsonb_build_object('course_id', o.course_id, 'amount', o.amount, 'commission', round(coalesce(o.amount,0) * v_pct / 100.0, 2)));
END;
$$;

-- ============ ORDER PAID: purchase email + referral ============
CREATE OR REPLACE FUNCTION public.automation_on_order_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.queue_automation(NEW.user_id, 'purchase_confirmed', NEW.id::text,
      jsonb_build_object('order_id', NEW.id, 'course_id', NEW.course_id, 'amount', NEW.amount, 'currency', NEW.currency, 'reference', NEW.reference));
    PERFORM public.record_affiliate_referral(NEW.id);
  ELSIF NEW.status = 'failed' AND (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'failed') THEN
    PERFORM public.queue_automation(NEW.user_id, 'payment_failed', NEW.id::text,
      jsonb_build_object('order_id', NEW.id, 'course_id', NEW.course_id));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_automation_on_order_paid ON public.orders;
CREATE TRIGGER trg_automation_on_order_paid
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.automation_on_order_paid();

-- ============ CART ADD ============
CREATE OR REPLACE FUNCTION public.automation_on_cart_add()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.queue_automation(NEW.user_id, 'cart_added', NEW.course_id::text,
    jsonb_build_object('course_id', NEW.course_id));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_automation_on_cart_add ON public.cart_items;
CREATE TRIGGER trg_automation_on_cart_add
AFTER INSERT ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION public.automation_on_cart_add();

-- ============ LESSON UNLOCKED ============
CREATE OR REPLACE FUNCTION public.automation_on_lesson_unlock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.queue_automation(NEW.user_id, 'lesson_unlocked', NEW.lesson_id::text,
    jsonb_build_object('lesson_id', NEW.lesson_id));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_automation_on_lesson_unlock ON public.lesson_unlocks;
CREATE TRIGGER trg_automation_on_lesson_unlock
AFTER INSERT ON public.lesson_unlocks
FOR EACH ROW EXECUTE FUNCTION public.automation_on_lesson_unlock();

-- ============ ASSESSMENT PUBLISHED (per enrolled learner) ============
CREATE OR REPLACE FUNCTION public.automation_on_assignment_visible()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_course uuid;
BEGIN
  IF NEW.is_visible IS DISTINCT FROM true THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_visible IS NOT DISTINCT FROM true THEN RETURN NEW; END IF;
  SELECT course_id INTO v_course FROM public.assignments WHERE id = NEW.id;
  IF v_course IS NULL THEN RETURN NEW; END IF;
  FOR r IN SELECT DISTINCT user_id FROM public.enrollments WHERE course_id = v_course AND user_id IS NOT NULL LOOP
    PERFORM public.queue_automation(r.user_id, 'assignment_published', NEW.id::text,
      jsonb_build_object('assignment_id', NEW.id, 'course_id', v_course, 'title', NEW.title));
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_automation_on_assignment_visible ON public.assignments;
CREATE TRIGGER trg_automation_on_assignment_visible
AFTER INSERT OR UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.automation_on_assignment_visible();

-- ============ WELCOME ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.automation_on_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.queue_automation(NEW.user_id, 'welcome', NULL, '{}'::jsonb);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_automation_on_profile ON public.profiles;
CREATE TRIGGER trg_automation_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.automation_on_profile();

-- ============ SUPPORT TICKETS ============
CREATE OR REPLACE FUNCTION public.automation_on_support_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.queue_automation(NEW.user_id, 'ticket_created', NEW.id::text,
      jsonb_build_object('ticket_id', NEW.id, 'ticket_number', NEW.ticket_number, 'subject', NEW.subject));
  ELSIF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    PERFORM public.queue_automation(NEW.user_id, 'ticket_resolved', NEW.id::text,
      jsonb_build_object('ticket_id', NEW.id, 'ticket_number', NEW.ticket_number, 'subject', NEW.subject));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_automation_on_support_ticket ON public.support_tickets;
CREATE TRIGGER trg_automation_on_support_ticket
AFTER INSERT OR UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.automation_on_support_ticket();

-- ============ AFFILIATE LIFECYCLE ============
CREATE OR REPLACE FUNCTION public.automation_on_affiliate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.queue_automation(NEW.user_id, 'affiliate_application_received', NEW.id::text, '{}'::jsonb);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.queue_automation(NEW.user_id, 'affiliate_approved', NEW.id::text, jsonb_build_object('code', NEW.code));
    ELSIF NEW.status IN ('rejected','declined') THEN
      PERFORM public.queue_automation(NEW.user_id, 'affiliate_declined', NEW.id::text, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_automation_on_affiliate ON public.affiliates;
CREATE TRIGGER trg_automation_on_affiliate
AFTER INSERT OR UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.automation_on_affiliate();

CREATE OR REPLACE FUNCTION public.automation_on_affiliate_selection()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    SELECT user_id INTO v_user FROM public.affiliates WHERE id = NEW.affiliate_id;
    PERFORM public.queue_automation(v_user, 'affiliate_course_approved', NEW.id::text,
      jsonb_build_object('course_id', NEW.course_id, 'referral_code', NEW.referral_code));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_automation_on_affiliate_selection ON public.affiliate_course_selections;
CREATE TRIGGER trg_automation_on_affiliate_selection
AFTER UPDATE ON public.affiliate_course_selections
FOR EACH ROW EXECUTE FUNCTION public.automation_on_affiliate_selection();

CREATE OR REPLACE FUNCTION public.automation_on_affiliate_payout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  SELECT user_id INTO v_user FROM public.affiliates WHERE id = NEW.affiliate_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.queue_automation(v_user, 'payout_requested', NEW.id::text, jsonb_build_object('amount', NEW.amount));
  ELSIF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    PERFORM public.queue_automation(v_user, 'payout_paid', NEW.id::text, jsonb_build_object('amount', NEW.amount));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_automation_on_affiliate_payout ON public.affiliate_payouts;
CREATE TRIGGER trg_automation_on_affiliate_payout
AFTER INSERT OR UPDATE ON public.affiliate_payouts
FOR EACH ROW EXECUTE FUNCTION public.automation_on_affiliate_payout();

-- ============ SCHEDULED AUTOMATIONS ============
CREATE OR REPLACE FUNCTION public.queue_scheduled_automations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; v_cart int := 0; v_idle int := 0; v_due int := 0; v_conf int := 0;
BEGIN
  -- abandoned carts (older than 24h, not purchased)
  FOR r IN
    SELECT ci.user_id, min(ci.created_at) since, count(*) items
    FROM public.cart_items ci
    WHERE ci.created_at < now() - interval '24 hours'
    GROUP BY ci.user_id
  LOOP
    PERFORM public.queue_automation(r.user_id, 'cart_abandoned', to_char(r.since, 'YYYYMMDD'),
      jsonb_build_object('items', r.items));
    v_cart := v_cart + 1;
  END LOOP;

  -- inactive learners: enrolled, no lesson progress in 7 days
  FOR r IN
    SELECT e.user_id, max(coalesce(lp.updated_at, e.created_at)) last_seen
    FROM public.enrollments e
    LEFT JOIN public.lesson_progress lp ON lp.user_id = e.user_id
    GROUP BY e.user_id
    HAVING max(coalesce(lp.updated_at, e.created_at)) < now() - interval '7 days'
  LOOP
    PERFORM public.queue_automation(r.user_id, 'inactivity_nudge', to_char(date_trunc('week', now()), 'YYYYMMDD'), '{}'::jsonb);
    v_idle := v_idle + 1;
  END LOOP;

  -- installment due soon (next 3 days)
  FOR r IN
    SELECT p.id, p.user_id, p.next_due_date, p.balance
    FROM public.installment_plans p
    WHERE p.status = 'active' AND p.next_due_date IS NOT NULL
      AND p.next_due_date <= (now() + interval '3 days')::date
      AND p.next_due_date >= now()::date
  LOOP
    PERFORM public.queue_automation(r.user_id, 'installment_due', r.id::text || ':' || r.next_due_date::text,
      jsonb_build_object('due_date', r.next_due_date, 'balance', r.balance));
    v_due := v_due + 1;
  END LOOP;

  -- confirm referrals older than the 14 day refund window
  UPDATE public.affiliate_referrals
  SET status = 'confirmed', updated_at = now()
  WHERE status = 'pending' AND created_at < now() - interval '14 days';
  GET DIAGNOSTICS v_conf = ROW_COUNT;

  RETURN jsonb_build_object('carts', v_cart, 'idle', v_idle, 'due', v_due, 'confirmed', v_conf);
END;
$$;

-- ============ BACKFILL PAST REFERRED ORDERS ============
DO $$
DECLARE o record;
BEGIN
  FOR o IN SELECT id FROM public.orders WHERE status = 'completed' AND (metadata ? 'affiliate_code' OR metadata ? 'ref') LOOP
    PERFORM public.record_affiliate_referral(o.id);
  END LOOP;
END $$;