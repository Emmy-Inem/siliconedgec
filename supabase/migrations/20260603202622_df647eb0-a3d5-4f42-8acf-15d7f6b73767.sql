ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS course_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.promo_codes.course_ids IS
  'Empty array = applies to all courses. Otherwise, code is only valid for the listed course IDs.';

DROP FUNCTION IF EXISTS public.validate_promo_code(text);

CREATE OR REPLACE FUNCTION public.validate_promo_code(p_code text)
 RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric, influencer_name text, max_uses integer, usage_count integer, expires_at timestamp with time zone, is_active boolean, slug text, landing_path text, utm_source text, utm_medium text, utm_campaign text, utm_content text, course_ids uuid[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, code, discount_type, discount_value, influencer_name,
         max_uses, usage_count, expires_at, is_active, slug, landing_path,
         utm_source, utm_medium, utm_campaign, utm_content, course_ids
  FROM public.promo_codes
  WHERE upper(code) = upper(p_code) AND is_active = true
  LIMIT 1;
$function$;

UPDATE public.promo_codes
   SET course_ids = ARRAY['3b1f29ec-8fd4-4ff0-9357-1987b90e6c91']::uuid[]
 WHERE upper(code) = 'PROMO-SEC2';