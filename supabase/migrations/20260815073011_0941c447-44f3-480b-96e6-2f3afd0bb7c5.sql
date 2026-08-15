CREATE OR REPLACE FUNCTION public.career_program_stats()
RETURNS TABLE(courses_count integer, partners_count integer, max_commission numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)::int FROM public.courses WHERE is_published = true),
    (SELECT count(*)::int FROM public.affiliates WHERE status = 'approved'),
    COALESCE((SELECT max(commission_percentage) FROM public.affiliates WHERE status = 'approved'), 20)::numeric
$$;

GRANT EXECUTE ON FUNCTION public.career_program_stats() TO anon, authenticated, service_role;