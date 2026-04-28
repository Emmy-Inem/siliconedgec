CREATE TABLE IF NOT EXISTS public.gone_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gone_urls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read gone urls" ON public.gone_urls FOR SELECT USING (true);
CREATE POLICY "Admins manage gone urls" ON public.gone_urls FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));