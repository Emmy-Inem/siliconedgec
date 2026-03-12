import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useUtmTracking, getStoredUtmParams } from "@/hooks/useUtmTracking";
import { trackLead } from "@/lib/track-lead";

/** Captures UTM params from URL on every route change and stores them in localStorage.
 *  Also auto-records a "page_visit" lead when UTM params are present in the URL. */
export function UtmTracker() {
  useUtmTracking();
  const location = useLocation();
  const tracked = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasUtm = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].some(
      (k) => params.get(k)
    );

    if (hasUtm) {
      // Build a unique key so we only track once per unique UTM+path combo per session
      const key = `${params.get("utm_source") ?? ""}|${params.get("utm_campaign") ?? ""}|${location.pathname}`;
      if (tracked.current === key) return;
      tracked.current = key;

      // Small delay to let useUtmTracking store the params first
      const timer = setTimeout(() => {
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
      return () => clearTimeout(timer);
    }
  }, [location.search, location.pathname]);

  return null;
}
