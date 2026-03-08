
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Admin activity log
CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity log"
  ON public.admin_activity_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert activity log"
  ON public.admin_activity_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_activity_log_admin ON public.admin_activity_log(admin_user_id);
CREATE INDEX idx_activity_log_created ON public.admin_activity_log(created_at DESC);

-- Email announcements table
CREATE TABLE public.email_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  target_audience text NOT NULL DEFAULT 'all',
  sent_by uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipient_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'sent'
);

ALTER TABLE public.email_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage announcements"
  ON public.email_announcements FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
