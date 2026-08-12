CREATE TABLE public.email_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  provider text NOT NULL DEFAULT 'lovable',
  category text NOT NULL DEFAULT 'transactional',
  template_key text,
  campaign_id uuid,
  recipient_email text NOT NULL,
  user_id uuid,
  subject text,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  opened_at timestamptz,
  open_count integer NOT NULL DEFAULT 0,
  clicked_at timestamptz,
  click_count integer NOT NULL DEFAULT 0,
  bounced_at timestamptz,
  bounce_type text,
  complained_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_delivery_log_created_at ON public.email_delivery_log (created_at DESC);
CREATE INDEX idx_email_delivery_log_status ON public.email_delivery_log (status);
CREATE INDEX idx_email_delivery_log_recipient ON public.email_delivery_log (recipient_email);
CREATE INDEX idx_email_delivery_log_message_id ON public.email_delivery_log (message_id);

GRANT SELECT ON public.email_delivery_log TO authenticated;
GRANT ALL ON public.email_delivery_log TO service_role;

ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view email delivery log"
ON public.email_delivery_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE TRIGGER update_email_delivery_log_updated_at
BEFORE UPDATE ON public.email_delivery_log
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();