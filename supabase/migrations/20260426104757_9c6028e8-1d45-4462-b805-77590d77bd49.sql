CREATE TABLE public.site_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  drive_file_id TEXT,
  drive_file_url TEXT,
  drive_folder_id TEXT,
  size_bytes BIGINT,
  table_count INT,
  row_count BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'manual'
);

CREATE INDEX idx_site_backups_created_at ON public.site_backups (created_at DESC);

ALTER TABLE public.site_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backups"
  ON public.site_backups FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert backups"
  ON public.site_backups FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete backups"
  ON public.site_backups FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access"
  ON public.site_backups FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;