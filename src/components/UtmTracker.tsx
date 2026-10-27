import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useUtmTracking } from "@/hooks/useUtmTracking";
import { trackLead } from "@/lib/track-lead";
import { gaPageview, gaSetUserId } from "@/lib/analytics";
import { getVisitorGeo } from "@/lib/geo";
import { supabase } from "@/integrations/supabase/client";
import { analyticsPagePath } from "@/lib/search-policy";

/** Auth funnel pages → discriminated `form_type` for analytics joins.
 *  Each entry produces a dedicated event row alongside the generic pageview,
 *  so funnel charts can pivot on `auth_signin_view → auth_forgot_password_view
 *  → auth_reset_password_view → signup/login` without parsing pathnames. */
const AUTH_ROUTE_FORM_TYPES: Record<string, string> = {
  "/sign-in": "auth_signin_view",
  "/sign-up": "auth_signup_view",
  "/forgot-password": "auth_forgot_password_view",
  "/reset-password": "auth_reset_password_view",
};

/** Capture attribution and one internal/Google view per public navigation.
 * Repeated consecutive renders do not count as visits; actual revisits do. */
export function UtmTracker() {
  useUtmTracking();
  const location = useLocation();
  const lastInternalPath = useRef<string | null>(null);
  const lastGaPath = useRef<string | null>(null);

  // Warm geo lookup + push GA4 user_id once per session (so reports can join
  // signed-in users across devices). Fire-and-forget; never blocks routing.
  useEffect(() => {
    void getVisitorGeo();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) gaSetUserId(data.user.id);
    }).catch(() => { /* ignore */ });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      gaSetUserId(session?.user?.id ?? null);
    });
    return () => { sub?.subscription?.unsubscribe?.(); };
  }, []);

  // Track each navigation, including revisits; suppress only consecutive duplicates.
  useEffect(() => {
    if (/^\/admin(\/|$)/.test(location.pathname)) {
      lastGaPath.current = null;
      return;
    }
    const key = analyticsPagePath(location.pathname, location.search);
    if (lastGaPath.current === key) return;
    const timer = setTimeout(() => {
      lastGaPath.current = key;
      gaPageview(key);
    }, 300);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (/^\/admin(\/|$)/.test(location.pathname)) {
      lastInternalPath.current = null;
      return;
    }
    const key = analyticsPagePath(location.pathname, location.search);
    if (lastInternalPath.current === key) return;
    const timer = setTimeout(() => {
      lastInternalPath.current = key;
      const params = new URLSearchParams(location.search);
      const hasUtm = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].some(k => params.get(k));
      // One row per navigation, including revisits. Auth view types remain
      // available for funnels, without recording a second generic pageview.
      void trackLead({
        formType: AUTH_ROUTE_FORM_TYPES[location.pathname] || (hasUtm ? "page_visit" : "pageview"),
        formData: { path: location.pathname },
      }).catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
}
