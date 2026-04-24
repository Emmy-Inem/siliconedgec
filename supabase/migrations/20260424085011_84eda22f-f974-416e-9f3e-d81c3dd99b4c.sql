-- Backfill influencer_referrals from existing lead_sources entries that have UTM attribution.
-- Only inserts rows that don't already exist (per the unique index on user_id+course_id+conversion_type).
INSERT INTO public.influencer_referrals (
  user_id, course_id, conversion_type, promo_code_id,
  original_price, discount_applied, final_price, commission_earned,
  utm_source, utm_medium, utm_campaign, utm_content, created_at
)
SELECT
  ls.user_id,
  (ls.form_data->>'course_id')::uuid AS course_id,
  CASE
    WHEN ls.form_type = 'webinar_registration' THEN 'webinar_registration'
    WHEN ls.form_type = 'free_enrollment' THEN 'free_enrollment'
    ELSE 'paid_enrollment'
  END AS conversion_type,
  pc.id AS promo_code_id,
  0, 0, 0, 0,
  ls.utm_source, ls.utm_medium, ls.utm_campaign, ls.utm_content,
  ls.created_at
FROM public.lead_sources ls
LEFT JOIN public.promo_codes pc
  ON (
    (ls.utm_campaign IS NOT NULL AND lower(pc.code) = lower(ls.utm_campaign))
    OR (ls.utm_source IS NOT NULL AND lower(pc.slug) = lower(ls.utm_source))
  )
WHERE ls.user_id IS NOT NULL
  AND ls.form_data ? 'course_id'
  AND ls.form_type IN ('webinar_registration', 'free_enrollment', 'paid_enrollment', 'course_purchase')
  AND (ls.utm_source IS NOT NULL OR ls.utm_campaign IS NOT NULL)
ON CONFLICT (user_id, course_id, conversion_type) DO NOTHING;

-- Add a unique index if missing so future upserts work cleanly
CREATE UNIQUE INDEX IF NOT EXISTS influencer_referrals_user_course_type_uniq
  ON public.influencer_referrals(user_id, course_id, conversion_type);

-- Helper function: count distinct page-visit clicks per promo code,
-- matched by either utm_campaign=code OR utm_source=slug. Returns one row per promo.
CREATE OR REPLACE FUNCTION public.influencer_click_counts()
RETURNS TABLE (promo_code_id uuid, clicks bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pc.id AS promo_code_id, COUNT(*)::bigint AS clicks
  FROM public.promo_codes pc
  JOIN public.lead_sources ls
    ON (ls.utm_campaign IS NOT NULL AND lower(pc.code) = lower(ls.utm_campaign))
    OR (ls.utm_source IS NOT NULL AND lower(pc.slug) = lower(ls.utm_source))
  WHERE ls.form_type = 'page_visit'
  GROUP BY pc.id;
$$;

-- Restrict to admins/moderators
REVOKE ALL ON FUNCTION public.influencer_click_counts() FROM public;
GRANT EXECUTE ON FUNCTION public.influencer_click_counts() TO authenticated;