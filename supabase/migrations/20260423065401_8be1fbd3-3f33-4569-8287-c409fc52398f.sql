-- 0) Relax payment_status check to allow 'free'
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_payment_status_check;
ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_payment_status_check
  CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text, 'free'::text]));

-- 1) Dedupe existing duplicate webinar registrations (keep earliest)
DELETE FROM public.course_registrations cr
USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, course_id, registration_type
    ORDER BY created_at ASC
  ) AS rn
  FROM public.course_registrations
  WHERE user_id IS NOT NULL
) dups
WHERE cr.id = dups.id AND dups.rn > 1;

-- 2) Backfill missing enrollments for authenticated webinar registrations
INSERT INTO public.enrollments (user_id, course_id, payment_status)
SELECT DISTINCT cr.user_id, cr.course_id, 'free'
FROM public.course_registrations cr
WHERE cr.user_id IS NOT NULL
  AND cr.registration_type = 'webinar'
  AND NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = cr.user_id AND e.course_id = cr.course_id
  );

-- 3) Partial unique index to prevent duplicate authenticated registrations
CREATE UNIQUE INDEX IF NOT EXISTS course_registrations_user_course_type_uniq
ON public.course_registrations (user_id, course_id, registration_type)
WHERE user_id IS NOT NULL;

-- 4) Ensure enrollments uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_user_course_uniq
ON public.enrollments (user_id, course_id);

-- 5) Extend influencer_referrals for non-paid conversions
ALTER TABLE public.influencer_referrals
  ADD COLUMN IF NOT EXISTS conversion_type text NOT NULL DEFAULT 'paid_enrollment',
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS registration_id uuid,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text;

-- 6) Allow promo_code_id to be nullable for UTM-only attributions
ALTER TABLE public.influencer_referrals
  ALTER COLUMN promo_code_id DROP NOT NULL;

-- 7) Uniqueness: same user + course + conversion_type counted once
CREATE UNIQUE INDEX IF NOT EXISTS influencer_referrals_user_course_type_uniq
ON public.influencer_referrals (user_id, course_id, conversion_type);
