-- NEWSLETTER SUBSCRIBERS
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'footer',
  groups TEXT[] NOT NULL DEFAULT '{}',
  confirm_token UUID NOT NULL DEFAULT gen_random_uuid(),
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_status_check CHECK (status IN ('pending','subscribed','unsubscribed','bounced'))
);

GRANT INSERT ON public.newsletter_subscribers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
ON public.newsletter_subscribers FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending');

CREATE POLICY "Admins manage subscribers"
ON public.newsletter_subscribers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users see own subscription"
ON public.newsletter_subscribers FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- NEWSLETTER CAMPAIGNS
CREATE TABLE public.newsletter_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'subscribers',
  group_name TEXT,
  course_id UUID,
  target_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  sent_by UUID,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_campaigns TO authenticated;
GRANT ALL ON public.newsletter_campaigns TO service_role;

ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns"
ON public.newsletter_campaigns FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_newsletter_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER newsletter_subscribers_touch
BEFORE UPDATE ON public.newsletter_subscribers
FOR EACH ROW EXECUTE FUNCTION public.touch_newsletter_updated_at();

CREATE TRIGGER newsletter_campaigns_touch
BEFORE UPDATE ON public.newsletter_campaigns
FOR EACH ROW EXECUTE FUNCTION public.touch_newsletter_updated_at();

-- Secure self-service confirm / unsubscribe by token
CREATE OR REPLACE FUNCTION public.newsletter_confirm(_token UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _email TEXT;
BEGIN
  UPDATE public.newsletter_subscribers
  SET status = 'subscribed', confirmed_at = COALESCE(confirmed_at, now()), unsubscribed_at = NULL
  WHERE confirm_token = _token
  RETURNING email INTO _email;
  RETURN _email;
END;
$$;

CREATE OR REPLACE FUNCTION public.newsletter_unsubscribe(_token UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _email TEXT;
BEGIN
  UPDATE public.newsletter_subscribers
  SET status = 'unsubscribed', unsubscribed_at = now()
  WHERE unsubscribe_token = _token
  RETURNING email INTO _email;
  RETURN _email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.newsletter_confirm(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.newsletter_unsubscribe(UUID) TO anon, authenticated;

-- TESTIMONIALS: video support
ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;