-- ==============================================================================
-- Migration: Optimize Idle Database Consumption & Background Polling
-- 1. Unschedule 5-second 'process-email-queue' cron job.
-- 2. Make email dispatch event-driven inside enqueue_email() via net.http_post.
-- 3. Reschedule 'process-email-queue' as a 5-minute fallback heartbeat with IF EXISTS check.
-- 4. Add partial index on live_classes for reminder query.
-- 5. Reschedule 'live-class-reminder-15min' with IF EXISTS check to avoid waking Edge Function when no classes exist.
-- 6. Add bounded time ranges to queue_scheduled_automations() to prevent full historical table scans.
-- 7. Prune bloated cron.job_run_details and schedule daily 3-day retention cleanup.
-- ==============================================================================

-- 1. Unschedule aggressive 5-second email queue cron job
DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'process-email-queue';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Event-driven email dispatch: trigger process-email-queue asynchronously upon enqueue
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg_id BIGINT;
  v_key TEXT;
BEGIN
  msg_id := pgmq.send(queue_name, payload);

  -- Asynchronously invoke the queue processor via net.http_post so the email sends immediately
  BEGIN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name IN ('service_role_key', 'email_queue_service_role_key')
    LIMIT 1;

    IF v_key IS NOT NULL AND v_key != '' THEN
      PERFORM net.http_post(
        url := 'https://sdddxnjlgjjaoayyraxn.supabase.co/functions/v1/process-email-queue',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If net.http_post fails or pg_net worker is busy, fallback heartbeat will process it
    NULL;
  END;

  RETURN msg_id;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

-- 3. Reschedule 'process-email-queue' as a 15-minute fallback heartbeat with IF EXISTS check
-- Only calls net.http_post if there are pending messages in either queue
SELECT cron.schedule(
  'process-email-queue',
  '*/15 * * * *',
  format(
    $cron$
    DO $body$
    DECLARE
      v_has_emails boolean := false;
      v_key text;
    BEGIN
      BEGIN
        IF (EXISTS (SELECT 1 FROM pgmq.q_auth_emails LIMIT 1)
            OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails LIMIT 1)) THEN
          v_has_emails := true;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_has_emails := false;
      END;

      IF v_has_emails THEN
        SELECT decrypted_secret INTO v_key
        FROM vault.decrypted_secrets
        WHERE name IN ('service_role_key', 'email_queue_service_role_key')
        LIMIT 1;

        IF v_key IS NOT NULL AND v_key != '' THEN
          PERFORM net.http_post(
            url := 'https://sdddxnjlgjjaoayyraxn.supabase.co/functions/v1/process-email-queue',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || v_key
            ),
            body := '{}'::jsonb
          );
        END IF;
      END IF;
    END $body$;
    $cron$
  )
);

-- 4. Create partial index for pending live class reminders
CREATE INDEX IF NOT EXISTS idx_live_classes_reminder_pending
ON public.live_classes (scheduled_at)
WHERE reminder_sent_at IS NULL AND status != 'cancelled';

-- 5. Reschedule 'live-class-reminder-15min' with IF EXISTS check
DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'live-class-reminder-15min';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'live-class-reminder-15min',
  '*/15 * * * *',
  format(
    $cron$
    DO $body$
    DECLARE
      v_has_class boolean := false;
      v_key text;
    BEGIN
      -- Instant partial index check (0ms, 0 buffer reads when no class)
      IF EXISTS (
        SELECT 1 FROM public.live_classes
        WHERE reminder_sent_at IS NULL
          AND status != 'cancelled'
          AND scheduled_at BETWEEN (now() + interval '50 minutes') AND (now() + interval '80 minutes')
      ) THEN
        SELECT decrypted_secret INTO v_key
        FROM vault.decrypted_secrets
        WHERE name IN ('service_role_key', 'anon_key')
        LIMIT 1;

        IF v_key IS NOT NULL AND v_key != '' THEN
          PERFORM net.http_post(
            url := 'https://sdddxnjlgjjaoayyraxn.supabase.co/functions/v1/live-class-reminder',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || v_key
            ),
            body := '{}'::jsonb
          );
        END IF;
      END IF;
    END $body$;
    $cron$
  )
);

-- 6. Add bounded time ranges to queue_scheduled_automations() to prevent full historical table scans
CREATE OR REPLACE FUNCTION public.queue_scheduled_automations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_cart int := 0;
  v_idle int := 0;
  v_due int := 0;
  v_conf int := 0;
BEGIN
  -- Abandoned carts: only inspect carts created between 24h and 72h ago
  FOR r IN
    SELECT ci.user_id, min(ci.created_at) since, count(*) items
    FROM public.cart_items ci
    WHERE ci.created_at >= now() - interval '72 hours'
      AND ci.created_at < now() - interval '24 hours'
    GROUP BY ci.user_id
  LOOP
    PERFORM public.queue_automation(
      r.user_id,
      'cart_abandoned',
      to_char(r.since, 'YYYYMMDD'),
      jsonb_build_object('items', r.items)
    );
    v_cart := v_cart + 1;
  END LOOP;

  -- Inactivity nudges: only inspect users whose last activity was between 7 and 14 days ago
  FOR r IN
    SELECT e.user_id,
           max(coalesce(lp.last_opened_at, lp.completed_at, lp.created_at, e.created_at)) last_seen
    FROM public.enrollments e
    LEFT JOIN public.lesson_progress lp ON lp.user_id = e.user_id
    GROUP BY e.user_id
    HAVING max(coalesce(lp.last_opened_at, lp.completed_at, lp.created_at, e.created_at)) >= now() - interval '14 days'
       AND max(coalesce(lp.last_opened_at, lp.completed_at, lp.created_at, e.created_at)) < now() - interval '7 days'
  LOOP
    PERFORM public.queue_automation(
      r.user_id,
      'inactivity_nudge',
      to_char(date_trunc('week', now()), 'YYYYMMDD'),
      '{}'::jsonb
    );
    v_idle := v_idle + 1;
  END LOOP;

  -- Installments due within next 3 days
  FOR r IN
    SELECT p.id, p.user_id, p.next_due_date,
           (coalesce(p.total_amount, 0) - coalesce(p.amount_paid, 0)) AS balance
    FROM public.installment_plans p
    WHERE p.status = 'active'
      AND p.next_due_date IS NOT NULL
      AND p.next_due_date <= (now() + interval '3 days')::date
      AND p.next_due_date >= now()::date
  LOOP
    PERFORM public.queue_automation(
      r.user_id,
      'installment_due',
      r.id::text || ':' || r.next_due_date::text,
      jsonb_build_object('due_date', r.next_due_date, 'balance', r.balance)
    );
    v_due := v_due + 1;
  END LOOP;

  -- Confirm affiliate referrals pending > 14 days
  UPDATE public.affiliate_referrals
  SET status = 'confirmed', updated_at = now()
  WHERE status = 'pending' AND created_at < now() - interval '14 days';
  GET DIAGNOSTICS v_conf = ROW_COUNT;

  RETURN jsonb_build_object('carts', v_cart, 'idle', v_idle, 'due', v_due, 'confirmed', v_conf);
END;
$$;

REVOKE ALL ON FUNCTION public.queue_scheduled_automations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_scheduled_automations() TO service_role;

-- 7. Prune historical cron.job_run_details and schedule daily 3-day retention cleanup
DO $$
BEGIN
  DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'purge-cron-history';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'purge-cron-history',
  '30 3 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days';$$
);
