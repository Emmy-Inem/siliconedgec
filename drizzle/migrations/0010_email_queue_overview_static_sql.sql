CREATE OR REPLACE FUNCTION public.admin_email_queue_overview(p_limit integer DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_queues jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_state jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Fixed, static queries only: no SQL is assembled at run time.
  SELECT jsonb_build_array(
    (SELECT jsonb_build_object('queue','auth_emails','length',count(*),'oldest_at',min(enqueued_at)) FROM pgmq.q_auth_emails),
    (SELECT jsonb_build_object('queue','transactional_emails','length',count(*),'oldest_at',min(enqueued_at)) FROM pgmq.q_transactional_emails),
    (SELECT jsonb_build_object('queue','auth_emails_dlq','length',count(*),'oldest_at',min(enqueued_at)) FROM pgmq.q_auth_emails_dlq),
    (SELECT jsonb_build_object('queue','transactional_emails_dlq','length',count(*),'oldest_at',min(enqueued_at)) FROM pgmq.q_transactional_emails_dlq)
  ) INTO v_queues;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_recent
  FROM (
    SELECT l.id, l.message_id, l.template_name, l.recipient_email, l.status, l.error_message, l.created_at,
           (SELECT count(*) FROM public.email_send_log f
             WHERE f.message_id = l.message_id AND f.status IN ('failed','rate_limited')) AS retry_count
    FROM public.email_send_log l
    ORDER BY l.created_at DESC
    LIMIT greatest(1, least(coalesce(p_limit, 200), 500))
  ) t;

  SELECT to_jsonb(s) INTO v_state FROM public.email_send_state s LIMIT 1;

  RETURN jsonb_build_object('queues', v_queues, 'recent', v_recent, 'state', coalesce(v_state, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_email_queue_overview(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_email_queue_overview(integer) TO authenticated;