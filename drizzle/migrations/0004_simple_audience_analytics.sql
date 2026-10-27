CREATE OR REPLACE FUNCTION public.record_analytics_login()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid; session_created timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  sid := nullif(auth.jwt()->>'session_id','')::uuid;
  SELECT created_at INTO session_created FROM auth.sessions WHERE id = sid AND user_id = auth.uid();
  IF session_created IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_activity_log(user_id, action, entity_type, entity_id, created_at)
  SELECT auth.uid(), 'login_session', 'auth_session', sid::text, session_created
  WHERE NOT EXISTS (SELECT 1 FROM public.user_activity_log WHERE action='login_session' AND entity_id=sid::text)
  ON CONFLICT DO NOTHING;
END; $$;
CREATE UNIQUE INDEX IF NOT EXISTS analytics_login_session_unique ON public.user_activity_log(entity_id) WHERE action='login_session';
REVOKE ALL ON FUNCTION public.record_analytics_login() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_analytics_login() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_audience_analytics(p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to <= p_from THEN RAISE EXCEPTION 'Invalid date range'; END IF;
  WITH visits AS (
    SELECT l.created_at, regexp_replace(split_part(split_part(coalesce(l.landing_page,'/'), '?',1),'#',1), '^https?://[^/]+', '') AS page,
      coalesce(nullif(l.form_data->>'visitor_id',''), l.user_id::text) AS visitor,
      upper(nullif(l.form_data->>'country','')) AS country,
      l.form_data->>'user_agent' AS ua, l.form_data->>'screen_w' AS screen_w,
      l.utm_source, l.referrer
    FROM public.lead_sources l
    WHERE l.created_at >= p_from AND l.created_at < p_to
      AND l.form_type IN ('pageview','page_visit','auth_signin_view','auth_signup_view','auth_forgot_password_view','auth_reset_password_view')
      AND coalesce(l.landing_page,'/') !~* '(^/admin(/|$)|localhost|127\.0\.0\.1|preview|lovableproject\.com)'
      AND coalesce(l.form_data->>'tracking_host','') !~* '(localhost|127\.0\.0\.1|preview|lovableproject\.com)'
      AND coalesce(l.form_data->>'user_agent','') !~* '(bot|crawler|spider|crawling|headless|lighthouse|slurp|preview)'
  ), signups AS (
    SELECT id, created_at FROM auth.users WHERE created_at >= p_from AND created_at < p_to
  ), logins AS (
    SELECT u.id AS user_id, a.created_at FROM public.login_attempts a JOIN auth.users u ON lower(u.email)=lower(a.email)
    WHERE a.success AND a.created_at >= p_from AND a.created_at < p_to
    UNION
    SELECT user_id, created_at FROM auth.sessions WHERE created_at >= p_from AND created_at < p_to
    UNION
    SELECT user_id, created_at FROM public.user_activity_log WHERE action='login_session' AND created_at >= p_from AND created_at < p_to
  ), pages AS (
    SELECT page, count(*) AS views FROM visits GROUP BY page ORDER BY views DESC, page LIMIT 10
  ), countries AS (
    SELECT CASE WHEN country ~ '^[A-Z]{2}$' THEN country ELSE 'Unknown' END AS name,
      count(*) AS views, count(DISTINCT visitor) AS visitors FROM visits GROUP BY 1 ORDER BY views DESC
  ), devices AS (
    SELECT CASE WHEN ua ~* '(ipad|tablet)' THEN 'Tablet' WHEN ua ~* '(mobi|android|iphone)' THEN 'Mobile'
      WHEN nullif(ua,'') IS NOT NULL THEN 'Desktop'
      WHEN screen_w ~ '^[0-9]+$' THEN CASE WHEN screen_w::numeric < 768 THEN 'Mobile' WHEN screen_w::numeric < 1024 THEN 'Tablet' ELSE 'Desktop' END
      ELSE 'Unknown' END AS name, count(*) AS views FROM visits GROUP BY 1 ORDER BY views DESC
  ), sources AS (
    SELECT coalesce(nullif(utm_source,''), nullif(regexp_replace(referrer,'^https?://([^/]+).*$', '\1'),''), 'Direct') AS name,
      count(*) AS views FROM visits GROUP BY 1 ORDER BY views DESC LIMIT 8
  ), daily AS (
    SELECT d::date AS day,
      (SELECT count(*) FROM signups s WHERE s.created_at >= d AND s.created_at < d + interval '1 day') AS signups,
      (SELECT count(*) FROM visits v WHERE v.created_at >= d AND v.created_at < d + interval '1 day') AS views,
      (SELECT count(DISTINCT user_id) FROM logins l WHERE l.created_at >= d AND l.created_at < d + interval '1 day') AS logins
    FROM generate_series(date_trunc('day',p_from AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', date_trunc('day',(p_to - interval '1 microsecond') AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', interval '1 day') d
  )
  SELECT jsonb_build_object(
    'signups',(SELECT count(*) FROM signups),
    'visitors',(SELECT count(DISTINCT visitor) FROM visits),
    'pageviews',(SELECT count(*) FROM visits),
    'unidentifiedViews',(SELECT count(*) FROM visits WHERE visitor IS NULL),
    'loggedInPeople',(SELECT count(DISTINCT user_id) FROM logins),
    'countries',coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM countries c),'[]'::jsonb),
    'pages',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM pages p),'[]'::jsonb),
    'devices',coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM devices d),'[]'::jsonb),
    'sources',coalesce((SELECT jsonb_agg(to_jsonb(s)) FROM sources s),'[]'::jsonb),
    'daily',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY day) FROM daily d),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.admin_audience_analytics(timestamptz,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_audience_analytics(timestamptz,timestamptz) TO authenticated;