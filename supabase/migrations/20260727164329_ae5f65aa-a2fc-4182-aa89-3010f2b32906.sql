CREATE OR REPLACE FUNCTION public.get_cohort_leaderboard(p_cohort_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  role text,
  xp bigint,
  weekly_xp bigint,
  lessons_completed bigint,
  assignments_submitted bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_cohort_member(p_cohort_id, auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'moderator'::app_role, 'instructor'::app_role])
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    cm.user_id,
    p.full_name,
    p.avatar_url,
    cm.role,
    COALESCE((SELECT sum(x.points) FROM public.user_xp_events x WHERE x.user_id = cm.user_id), 0)::bigint,
    COALESCE((SELECT sum(x.points) FROM public.user_xp_events x
              WHERE x.user_id = cm.user_id AND x.created_at > now() - interval '7 days'), 0)::bigint,
    COALESCE((SELECT count(*) FROM public.lesson_progress lp
              WHERE lp.user_id = cm.user_id AND lp.is_completed), 0)::bigint,
    COALESCE((SELECT count(*) FROM public.assignment_submissions s
              WHERE s.user_id = cm.user_id), 0)::bigint
  FROM public.cohort_members cm
  LEFT JOIN public.profiles p ON p.user_id = cm.user_id
  WHERE cm.cohort_id = p_cohort_id
  ORDER BY 5 DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cohort_leaderboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cohort_leaderboard(uuid) TO authenticated, service_role;