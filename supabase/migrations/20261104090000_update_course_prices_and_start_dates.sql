-- 1. Clear discount_price on public.courses so server-side Paystack and Stripe checkout functions always charge course.price.
UPDATE public.courses
SET
  discount_price = NULL,
  updated_at = now()
WHERE discount_price IS NOT NULL;

-- 2. Set start_date = 2026-11-28 for all courses except the Data Engineering course (NULL),
--    and set duration_weeks = 4 for all courses so flexible installment schedules work out of the box.
UPDATE public.courses
SET
  start_date = CASE
    WHEN id = '20360c5a-2279-4a64-a373-3514f81cb600'
      OR slug = 'data-engineering-sql-etl-warehousing'
      OR title ILIKE '%Data Engineering%'
      OR category ILIKE '%Data Engineering%'
    THEN NULL
    ELSE DATE '2026-11-28'
  END,
  duration_weeks = COALESCE(NULLIF(duration_weeks, 0), 4),
  updated_at = now();

-- 3. Ensure any CMS-stored Terms of Service entry also reflects United Kingdom governing law.
UPDATE public.cms_pages
SET
  content = REPLACE(
    REPLACE(
      content,
      'laws of the Federal Republic of Nigeria',
      'laws of the United Kingdom'
    ),
    'laws of England and Wales',
    'laws of the United Kingdom'
  ),
  updated_at = now()
WHERE slug = 'terms';
