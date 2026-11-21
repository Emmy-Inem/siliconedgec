CREATE OR REPLACE FUNCTION public.influencer_click_counts()
 RETURNS TABLE(promo_code_id uuid, clicks bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT pc.id, COUNT(*)::bigint
  FROM public.promo_codes pc
  JOIN public.lead_sources ls
    ON (ls.utm_campaign IS NOT NULL AND lower(pc.code) = lower(ls.utm_campaign))
    OR (ls.utm_source IS NOT NULL AND lower(pc.slug) = lower(ls.utm_source))
  WHERE ls.form_type = 'page_visit'
  GROUP BY pc.id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.influencer_click_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.influencer_click_counts() TO authenticated, service_role;