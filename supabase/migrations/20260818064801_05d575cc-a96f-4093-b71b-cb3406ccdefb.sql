GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.queue_scheduled_automations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; v_cart int := 0; v_idle int := 0; v_due int := 0; v_conf int := 0;
BEGIN
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

  FOR r IN
    SELECT e.user_id,
           max(coalesce(lp.last_opened_at, lp.completed_at, lp.created_at, e.created_at)) last_seen
    FROM public.enrollments e
    LEFT JOIN public.lesson_progress lp ON lp.user_id = e.user_id
    GROUP BY e.user_id
    HAVING max(coalesce(lp.last_opened_at, lp.completed_at, lp.created_at, e.created_at)) < now() - interval '7 days'
  LOOP
    PERFORM public.queue_automation(r.user_id, 'inactivity_nudge', to_char(date_trunc('week', now()), 'YYYYMMDD'), '{}'::jsonb);
    v_idle := v_idle + 1;
  END LOOP;

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

  UPDATE public.affiliate_referrals
  SET status = 'confirmed', updated_at = now()
  WHERE status = 'pending' AND created_at < now() - interval '14 days';
  GET DIAGNOSTICS v_conf = ROW_COUNT;

  RETURN jsonb_build_object('carts', v_cart, 'idle', v_idle, 'due', v_due, 'confirmed', v_conf);
END;
$$;

REVOKE ALL ON FUNCTION public.queue_scheduled_automations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_scheduled_automations() TO service_role;