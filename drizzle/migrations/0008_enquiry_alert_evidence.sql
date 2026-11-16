ALTER TABLE public.business_leads
  ADD COLUMN IF NOT EXISTS notify_message_id text,
  ADD COLUMN IF NOT EXISTS notify_status text,
  ADD COLUMN IF NOT EXISTS notify_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notify_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS notify_error text;
GRANT SELECT ON public.email_send_log TO authenticated;
DROP POLICY IF EXISTS "Admins can read send log" ON public.email_send_log;
CREATE POLICY "Admins can read send log" ON public.email_send_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));