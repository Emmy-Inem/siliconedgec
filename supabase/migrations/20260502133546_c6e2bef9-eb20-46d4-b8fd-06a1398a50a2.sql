-- 1) Improve attribution: consider earliest UTM-bearing visit for the user
CREATE OR REPLACE FUNCTION public.auto_record_influencer_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Prefer the EARLIEST UTM-bearing visit for this user (90-day window)
  -- so OAuth round-trips that wipe the referrer don't lose the original
  -- influencer attribution.
  SELECT utm_source, utm_medium, utm_campaign, utm_content
    INTO v_utm
  FROM public.lead_sources
  WHERE user_id = NEW.user_id
    AND created_at >= now() - interval '90 days'
    AND (utm_source IS NOT NULL OR utm_campaign IS NOT NULL OR utm_content IS NOT NULL)
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_utm IS NULL THEN
    RETURN NEW;
  END IF;

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
  RETURN NEW;
END;
$function$;

-- 2) Keep promo_codes.usage_count truthful = COUNT(referrals)
CREATE OR REPLACE FUNCTION public.sync_promo_usage_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_promo uuid;
BEGIN
  v_promo := COALESCE(NEW.promo_code_id, OLD.promo_code_id);
  IF v_promo IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  UPDATE public.promo_codes
     SET usage_count = (SELECT COUNT(*) FROM public.influencer_referrals WHERE promo_code_id = v_promo)
   WHERE id = v_promo;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_promo_usage_count ON public.influencer_referrals;
CREATE TRIGGER trg_sync_promo_usage_count
AFTER INSERT OR DELETE OR UPDATE OF promo_code_id ON public.influencer_referrals
FOR EACH ROW EXECUTE FUNCTION public.sync_promo_usage_count();

-- 3) One-time backfill of usage_count from existing referrals
UPDATE public.promo_codes pc
   SET usage_count = sub.cnt
  FROM (
    SELECT promo_code_id, COUNT(*)::int AS cnt
      FROM public.influencer_referrals
     WHERE promo_code_id IS NOT NULL
     GROUP BY promo_code_id
  ) sub
 WHERE pc.id = sub.promo_code_id;

-- 4) Make sure registration trigger is actually attached (idempotent)
DROP TRIGGER IF EXISTS trg_auto_record_influencer_referral ON public.course_registrations;
CREATE TRIGGER trg_auto_record_influencer_referral
AFTER INSERT ON public.course_registrations
FOR EACH ROW EXECUTE FUNCTION public.auto_record_influencer_referral();

DROP TRIGGER IF EXISTS trg_auto_record_influencer_referral_order ON public.orders;
CREATE TRIGGER trg_auto_record_influencer_referral_order
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.auto_record_influencer_referral_order();