
-- Backfill influencer_referrals from existing webinar course_registrations
-- by matching the most-recent UTM lead_source for the same user.
INSERT INTO public.influencer_referrals (
  user_id, course_id, conversion_type, promo_code_id, registration_id,
  utm_source, utm_medium, utm_campaign, utm_content,
  original_price, discount_applied, final_price, commission_earned
)
SELECT DISTINCT ON (cr.user_id, cr.course_id)
  cr.user_id,
  cr.course_id,
  'webinar_registration'::text,
  pc.id,
  cr.id,
  ls.utm_source,
  ls.utm_medium,
  ls.utm_campaign,
  ls.utm_content,
  0, 0, 0, 0
FROM public.course_registrations cr
JOIN public.lead_sources ls
  ON ls.user_id = cr.user_id
  AND ls.created_at <= cr.created_at + interval '5 minutes'
  AND (ls.utm_source IS NOT NULL OR ls.utm_campaign IS NOT NULL)
LEFT JOIN public.promo_codes pc
  ON (ls.utm_campaign IS NOT NULL AND lower(pc.code) = lower(ls.utm_campaign))
  OR (ls.utm_source IS NOT NULL AND lower(pc.slug) = lower(ls.utm_source))
WHERE cr.registration_type = 'webinar'
  AND NOT EXISTS (
    SELECT 1 FROM public.influencer_referrals ir
    WHERE ir.user_id = cr.user_id
      AND ir.course_id = cr.course_id
      AND ir.conversion_type = 'webinar_registration'
  )
ORDER BY cr.user_id, cr.course_id, ls.created_at DESC
ON CONFLICT (user_id, course_id, conversion_type) DO NOTHING;

-- Trigger function: when a new course_registration is inserted, automatically
-- create the matching influencer_referrals row using the most recent UTM lead.
CREATE OR REPLACE FUNCTION public.auto_record_influencer_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_utm RECORD;
  v_promo_id uuid;
  v_conversion_type text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.registration_type = 'webinar' THEN
    v_conversion_type := 'webinar_registration';
  ELSE
    v_conversion_type := 'free_enrollment';
  END IF;

  -- Most recent UTM-bearing lead_source for this user (within 30 days)
  SELECT utm_source, utm_medium, utm_campaign, utm_content
    INTO v_utm
  FROM public.lead_sources
  WHERE user_id = NEW.user_id
    AND created_at >= now() - interval '30 days'
    AND (utm_source IS NOT NULL OR utm_campaign IS NOT NULL OR utm_content IS NOT NULL)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_utm IS NULL THEN
    RETURN NEW;
  END IF;

  -- Try to resolve a promo_code by campaign or slug
  SELECT id INTO v_promo_id
  FROM public.promo_codes
  WHERE is_active = true
    AND (
      (v_utm.utm_campaign IS NOT NULL AND lower(code) = lower(v_utm.utm_campaign))
      OR (v_utm.utm_source IS NOT NULL AND lower(slug) = lower(v_utm.utm_source))
    )
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO public.influencer_referrals (
    user_id, course_id, conversion_type, promo_code_id, registration_id,
    utm_source, utm_medium, utm_campaign, utm_content,
    original_price, discount_applied, final_price, commission_earned
  ) VALUES (
    NEW.user_id, NEW.course_id, v_conversion_type, v_promo_id, NEW.id,
    v_utm.utm_source, v_utm.utm_medium, v_utm.utm_campaign, v_utm.utm_content,
    0, 0, 0, 0
  )
  ON CONFLICT (user_id, course_id, conversion_type) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block registrations on attribution failures
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_record_influencer_referral ON public.course_registrations;
CREATE TRIGGER trg_auto_record_influencer_referral
AFTER INSERT ON public.course_registrations
FOR EACH ROW EXECUTE FUNCTION public.auto_record_influencer_referral();

-- Same trigger for paid enrollments via orders table
CREATE OR REPLACE FUNCTION public.auto_record_influencer_referral_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_utm RECORD;
  v_promo_id uuid;
BEGIN
  IF NEW.status NOT IN ('paid','completed','success') THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  SELECT utm_source, utm_medium, utm_campaign, utm_content
    INTO v_utm
  FROM public.lead_sources
  WHERE user_id = NEW.user_id
    AND created_at >= now() - interval '30 days'
    AND (utm_source IS NOT NULL OR utm_campaign IS NOT NULL OR utm_content IS NOT NULL)
  ORDER BY created_at DESC
  LIMIT 1;

  v_promo_id := NEW.promo_code_id;
  IF v_promo_id IS NULL AND v_utm IS NOT NULL THEN
    SELECT id INTO v_promo_id
    FROM public.promo_codes
    WHERE is_active = true
      AND (
        (v_utm.utm_campaign IS NOT NULL AND lower(code) = lower(v_utm.utm_campaign))
        OR (v_utm.utm_source IS NOT NULL AND lower(slug) = lower(v_utm.utm_source))
      )
    LIMIT 1;
  END IF;

  IF v_promo_id IS NULL AND v_utm IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.influencer_referrals (
    user_id, course_id, conversion_type, promo_code_id, order_id,
    utm_source, utm_medium, utm_campaign, utm_content,
    original_price, discount_applied, final_price, commission_earned
  ) VALUES (
    NEW.user_id, NEW.course_id, 'paid_enrollment', v_promo_id, NEW.id,
    COALESCE(v_utm.utm_source, NULL),
    COALESCE(v_utm.utm_medium, NULL),
    COALESCE(v_utm.utm_campaign, NULL),
    COALESCE(v_utm.utm_content, NULL),
    NEW.amount + COALESCE(NEW.discount_amount, 0),
    COALESCE(NEW.discount_amount, 0),
    NEW.amount,
    CASE
      WHEN v_promo_id IS NOT NULL THEN
        NEW.amount * (SELECT commission_percentage FROM public.promo_codes WHERE id = v_promo_id) / 100.0
      ELSE 0
    END
  )
  ON CONFLICT (user_id, course_id, conversion_type) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_record_influencer_referral_order ON public.orders;
CREATE TRIGGER trg_auto_record_influencer_referral_order
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.auto_record_influencer_referral_order();
