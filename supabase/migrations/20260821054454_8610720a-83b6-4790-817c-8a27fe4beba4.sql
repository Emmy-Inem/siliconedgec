CREATE OR REPLACE FUNCTION public.admin_email_queue_overview(p_limit integer DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pgmq, extensions
AS $$
DECLARE
  v_queues jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_state jsonb := '{}'::jsonb;
  q text;
  v_len bigint;
  v_oldest timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOREACH q IN ARRAY ARRAY['auth_emails','transactional_emails','auth_emails_dlq','transactional_emails_dlq'] LOOP
    BEGIN
      EXECUTE format('SELECT count(*), min(enqueued_at) FROM pgmq.q_%I', q) INTO v_len, v_oldest;
    EXCEPTION WHEN others THEN
      BEGIN
        EXECUTE format('SELECT count(*), min(enqueued_at) FROM pgmq.a_%I', q) INTO v_len, v_oldest;
      EXCEPTION WHEN others THEN
        v_len := NULL; v_oldest := NULL;
      END;
    END;
    v_queues := v_queues || jsonb_build_array(
      jsonb_build_object('queue', q, 'length', v_len, 'oldest_at', v_oldest)
    );
  END LOOP;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_recent
  FROM (
    SELECT l.id,
           l.message_id,
           l.template_name,
           l.recipient_email,
           l.status,
           l.error_message,
           l.created_at,
           (
             SELECT count(*) FROM public.email_send_log f
             WHERE f.message_id = l.message_id AND f.status IN ('failed','rate_limited')
           ) AS retry_count
    FROM public.email_send_log l
    ORDER BY l.created_at DESC
    LIMIT greatest(1, least(coalesce(p_limit, 200), 500))
  ) t;

  SELECT to_jsonb(s) INTO v_state FROM public.email_send_state s LIMIT 1;

  RETURN jsonb_build_object('queues', v_queues, 'recent', v_recent, 'state', coalesce(v_state, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_email_queue_overview(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_email_queue_overview(integer) TO authenticated;