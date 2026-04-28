import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useUtmTracking, getStoredUtmParams } from "@/hooks/useUtmTracking";
import { trackLead } from "@/lib/track-lead";

/** Captures UTM params from URL on every route change and stores them in localStorage.
 *  - Records a high-signal `page_visit` lead row whenever UTM params are present in the URL
 *    (used by the marketing funnels + UTM coverage QA dashboard).
 *  - Records a lightweight `pageview` event on every route change (de-duped per session)
 *    so the QA dashboard can confirm tracking fires across the whole SPA, including
 *    /courses, /courses/:id, /verify/:code, /enroll callbacks, etc. */
export function UtmTracker() {
  useUtmTracking();
  const location = useLocation();
  const tracked = useRef<string | null>(null);
  const seenPaths = useRef<Set<string>>(new Set());

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
            },
          });
        }, 100);
        // Also record a pageview so non-UTM follow-up navigations are still measured
        seenPaths.current.add(location.pathname);
        return () => clearTimeout(utmTimer);
      }
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
        },
      }).catch(() => {/* swallow — tracking must never block UX */});
    }, 150);
    return () => clearTimeout(pvTimer);
  }, [location.search, location.pathname]);

  return null;
}
    }
  }, [location.search, location.pathname]);

  return null;
}
