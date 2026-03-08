
-- Promo codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  influencer_name TEXT NOT NULL,
  influencer_email TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 10,
  commission_percentage NUMERIC NOT NULL DEFAULT 10,
  usage_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  revenue_generated NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Influencer referrals tracking table
CREATE TABLE public.influencer_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  original_price NUMERIC NOT NULL DEFAULT 0,
  discount_applied NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  commission_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_referrals ENABLE ROW LEVEL SECURITY;

-- Only admins can manage promo codes
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can read active promo codes (for validation at checkout)
CREATE POLICY "Anyone can read active promo codes" ON public.promo_codes
  FOR SELECT USING (is_active = true);

-- Admins can manage referrals
CREATE POLICY "Admins can manage referrals" ON public.influencer_referrals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert referrals (for checkout)
CREATE POLICY "Users can insert referrals" ON public.influencer_referrals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
