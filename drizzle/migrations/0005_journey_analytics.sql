CREATE TABLE public.journey_choices (id uuid PRIMARY KEY, visitor_id uuid NOT NULL, accepted boolean NOT NULL, notice_version text NOT NULL, notice_text text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.journey_choices TO service_role;
ALTER TABLE public.journey_choices ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.journey_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, session_id uuid NOT NULL, consent_id uuid NOT NULL REFERENCES public.journey_choices(id), event text NOT NULL, path text NOT NULL, reason text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.journey_events TO authenticated;
GRANT ALL ON public.journey_events TO service_role;
ALTER TABLE public.journey_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read journey events" ON public.journey_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX journey_events_user_time ON public.journey_events(user_id,created_at);
CREATE INDEX journey_events_session_time ON public.journey_events(session_id,created_at);
CREATE OR REPLACE FUNCTION public.record_journey_choice(p_id uuid,p_visitor uuid,p_accepted boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO public.journey_choices(id,visitor_id,accepted,notice_version,notice_text) VALUES(p_id,p_visitor,p_accepted,'journey-2026-10-30','Optional website journey analytics: record pages, cart and checkout actions and categorized errors to improve the website. Signed-in activity is linked to your account. No passwords, form contents or payment details. Administrators see activity reports; Lovable AI receives aggregated counts for improvement suggestions. You may change your choice in Website analytics settings on the privacy page.') ON CONFLICT(id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.record_journey_choice(uuid,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_journey_choice(uuid,uuid,boolean) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.record_journey_event(p_event text,p_path text,p_session uuid,p_reason text,p_notice text,p_consent uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF p_event NOT IN ('page_view','cart_added','cart_removed','checkout_started','checkout_redirected','checkout_error','signup_error','signin_error','signup_submitted') OR p_path !~ '^/[^?#]*$' OR p_path ~ '^/(admin|reset-password|verify-receipt|newsletter)(/|$)' OR length(p_path)>300 OR p_notice<>'journey-2026-10-30' THEN RAISE EXCEPTION 'Invalid journey event'; END IF;
IF p_reason IS NOT NULL AND p_reason NOT IN ('validation','authentication','payment_setup','payment_verification') THEN RAISE EXCEPTION 'Invalid reason'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.journey_choices c WHERE c.id=p_consent AND c.accepted AND c.notice_version=p_notice AND NOT EXISTS(SELECT 1 FROM public.journey_choices n WHERE n.visitor_id=c.visitor_id AND n.created_at>c.created_at AND NOT n.accepted)) THEN RETURN; END IF;
IF (SELECT count(*) FROM public.journey_events WHERE session_id=p_session AND created_at>now()-interval '1 minute')>=60 THEN RETURN; END IF;
INSERT INTO public.journey_events(user_id,session_id,consent_id,event,path,reason) VALUES(auth.uid(),p_session,p_consent,p_event,p_path,p_reason);
END $$;
REVOKE ALL ON FUNCTION public.record_journey_event(text,text,uuid,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_journey_event(text,text,uuid,text,text,uuid) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.admin_journey_analytics(p_from timestamptz,p_to timestamptz) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
IF p_from IS NULL OR p_to IS NULL OR p_to<=p_from OR p_to-p_from>interval '366 days' THEN RAISE EXCEPTION 'Choose a date range within one year'; END IF;
WITH cohort AS (SELECT id,created_at FROM auth.users WHERE created_at>=p_from AND created_at<p_to AND NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.users.id AND r.role<>'user')),
ev AS (SELECT e.* FROM public.journey_events e JOIN cohort c ON c.id=e.user_id WHERE e.created_at>=c.created_at AND e.created_at<p_to),
last_pages AS (SELECT DISTINCT ON (e.session_id) e.session_id,e.path,e.created_at FROM ev e WHERE event='page_view' ORDER BY e.session_id,e.created_at DESC,e.id),
inactive AS (SELECT l.* FROM last_pages l WHERE NOT EXISTS(SELECT 1 FROM public.journey_events a WHERE a.session_id=l.session_id AND a.created_at>least(p_to,now())-interval '30 minutes')),
endpoints AS (SELECT path,count(*) AS sessions FROM inactive GROUP BY path ORDER BY sessions DESC,path LIMIT 10),
transitions AS (SELECT path AS from_page,lead(path) OVER(PARTITION BY session_id ORDER BY created_at,id) AS to_page FROM ev WHERE event='page_view'),
paths AS (SELECT from_page,to_page,count(*) AS transitions FROM transitions WHERE to_page IS NOT NULL AND from_page<>to_page GROUP BY from_page,to_page ORDER BY transitions DESC LIMIT 10),
friction AS (SELECT path,coalesce(reason,event) AS reason,count(*) AS events,count(DISTINCT user_id) AS people FROM public.journey_events WHERE event IN ('checkout_error','signup_error','signin_error') AND created_at>=p_from AND created_at<p_to GROUP BY path,coalesce(reason,event) ORDER BY events DESC LIMIT 10),
paid AS (SELECT DISTINCT o.user_id FROM public.orders o JOIN cohort c ON c.id=o.user_id WHERE o.status='paid' AND o.created_at>=c.created_at AND o.created_at<p_to),
learning AS (SELECT DISTINCT l.user_id FROM public.lesson_progress l JOIN cohort c ON c.id=l.user_id WHERE l.created_at>=c.created_at AND l.created_at<p_to),
reach AS (SELECT 'Signed up' AS stage,count(*) AS people,0 AS position FROM cohort UNION ALL SELECT 'Recorded activity',count(DISTINCT user_id),1 FROM ev UNION ALL SELECT 'Viewed a course',count(DISTINCT user_id),2 FROM ev WHERE event='page_view' AND path ~ '^/courses/[^/]+$' UNION ALL SELECT 'Opened cart',count(DISTINCT user_id),3 FROM ev WHERE event='page_view' AND path='/cart' UNION ALL SELECT 'Started checkout',count(DISTINCT user_id),4 FROM ev WHERE event='checkout_started' UNION ALL SELECT 'Paid',count(*),5 FROM paid UNION ALL SELECT 'Learning activity',count(*),6 FROM learning)
SELECT jsonb_build_object('cohortSize',(SELECT count(*) FROM cohort),'observedPeople',(SELECT count(DISTINCT user_id) FROM ev),'stages',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY position) FROM reach r),'[]'::jsonb),'endpoints',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM endpoints x),'[]'::jsonb),'transitions',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM paths x),'[]'::jsonb),'friction',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM friction x),'[]'::jsonb),'checkoutWithoutPayment',(SELECT count(DISTINCT e.user_id) FROM ev e WHERE e.event='checkout_started' AND e.created_at<least(p_to,now())-interval '24 hours' AND NOT EXISTS(SELECT 1 FROM public.orders o WHERE o.user_id=e.user_id AND o.status='paid' AND o.created_at>=e.created_at AND o.created_at<p_to)),'trackingSince',(SELECT min(created_at) FROM public.journey_events)) INTO result; RETURN result; END $$;
REVOKE ALL ON FUNCTION public.admin_journey_analytics(timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_journey_analytics(timestamptz,timestamptz) TO authenticated;