
-- UTM tracking / lead sources table
CREATE TABLE public.lead_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  landing_page TEXT,
  referrer TEXT,
  form_type TEXT,
  form_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lead sources" ON public.lead_sources
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert lead sources" ON public.lead_sources
  FOR INSERT WITH CHECK (true);

-- Course schema extensions for multi-step creation
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT 'virtual',
  ADD COLUMN IF NOT EXISTS discount_price NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS early_bird_price NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_enrollment INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enrollment_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enrollment_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intro_video_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS purchase_note TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enable_reviews BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS upsell_course_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cross_sell_course_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN';

-- Enable realtime for lead_sources for live dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_sources;
