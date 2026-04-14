
CREATE TABLE public.business_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_size TEXT,
  industry TEXT,
  training_needs TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit business leads"
ON public.business_leads
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can view business leads"
ON public.business_leads
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update business leads"
ON public.business_leads
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete business leads"
ON public.business_leads
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_business_leads_updated_at
BEFORE UPDATE ON public.business_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
