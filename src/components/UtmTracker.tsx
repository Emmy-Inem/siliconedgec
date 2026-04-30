import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useUtmTracking, getStoredUtmParams } from "@/hooks/useUtmTracking";
import { trackLead } from "@/lib/track-lead";

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

/** Captures UTM params from URL on every route change and stores them in localStorage.
 *  - Records a high-signal `page_visit` lead row whenever UTM params are present in the URL
 *    (used by the marketing funnels + UTM coverage QA dashboard).
 *  - Records a lightweight `pageview` event on every route change (de-duped per session)
 *    so the QA dashboard can confirm tracking fires across the whole SPA, including
 *    /courses, /courses/:id, /verify/:code, /enroll callbacks, etc.
 *  - Records a discriminated `auth_*_view` event for /sign-in, /sign-up,
 *    /forgot-password and /reset-password so the auth funnel can be measured
 *    independently of generic pageviews and joined to UTM attribution. */
export function UtmTracker() {
  useUtmTracking();
  const location = useLocation();
  const tracked = useRef<string | null>(null);
  const seenPaths = useRef<Set<string>>(new Set());
  const authTracked = useRef<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasUtm = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].some(
      (k) => params.get(k)
    );

    if (hasUtm) {
      // Build a unique key so we only track once per unique UTM+path combo per session
      const key = `${params.get("utm_source") ?? ""}|${params.get("utm_campaign") ?? ""}|${location.pathname}`;
      if (tracked.current !== key) {
        tracked.current = key;
        // Small delay to let useUtmTracking store the params first
        const utmTimer = setTimeout(() => {
          const utm = getStoredUtmParams();
          trackLead({
            formType: "page_visit",
            formData: {
              landing_page: location.pathname,
              utm_source: utm.utm_source,
              utm_medium: utm.utm_medium,
              utm_campaign: utm.utm_campaign,
              utm_content: utm.utm_content,
              utm_term: utm.utm_term,
              user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
              language: typeof navigator !== "undefined" ? navigator.language : null,
              screen_w: typeof window !== "undefined" ? window.innerWidth : null,
            },
          });
        }, 100);
        // Also record a pageview so non-UTM follow-up navigations are still measured
        seenPaths.current.add(location.pathname);
        return () => clearTimeout(utmTimer);
      }
    }

    // Auth funnel events — fire once per (path + recovery flag) per session.
    // We intentionally do NOT include the recovery token itself in form_data
    // (it would be a credential leak); we only record whether one is present.
    const authFormType = AUTH_ROUTE_FORM_TYPES[location.pathname];
    if (authFormType) {
      const hash = window.location.hash || "";
      const hasRecoveryToken = hash.includes("type=recovery") || hash.includes("access_token");
      const authKey = `${location.pathname}|${hasRecoveryToken ? "rec" : "std"}`;
      if (!authTracked.current.has(authKey)) {
        authTracked.current.add(authKey);
        // Carry the next-redirect target so we can attribute completed signups
        // back to the originating CTA (e.g. ?next=/courses/aws-cloud-practitioner).
        const search = new URLSearchParams(location.search);
        const nextParam = search.get("next") || search.get("redirect") || null;
        const emailHint = search.get("email"); // forgot-password may carry a prefill
        const authTimer = setTimeout(() => {
          trackLead({
            formType: authFormType,
            formData: {
              landing_page: location.pathname,
              next: nextParam,
              has_recovery_token: hasRecoveryToken || undefined,
              email_hint_present: emailHint ? true : undefined,
              referrer: document.referrer || null,
              user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
            },
          }).catch(() => {});
        }, 120);
        // Don't double-count this path as a generic pageview
        seenPaths.current.add(location.pathname);
        return () => clearTimeout(authTimer);
      }
      // Already tracked this auth path this session — fall through to skip pageview
      seenPaths.current.add(location.pathname);
      return;
    }

    // Generic pageview tracking — once per pathname per session, skips admin to avoid noise
    if (location.pathname.startsWith("/admin")) return;
    if (seenPaths.current.has(location.pathname)) return;
    seenPaths.current.add(location.pathname);
    const pvTimer = setTimeout(() => {
      trackLead({
        formType: "pageview",
        formData: {
          path: location.pathname,
          search: location.search || null,
          referrer: document.referrer || null,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          language: typeof navigator !== "undefined" ? navigator.language : null,
          screen_w: typeof window !== "undefined" ? window.innerWidth : null,
        },
      }).catch(() => {/* swallow — tracking must never block UX */});
    }, 150);
    return () => clearTimeout(pvTimer);
  }, [location.search, location.pathname, location.hash]);

  return null;
}
