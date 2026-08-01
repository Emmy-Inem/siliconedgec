import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const KEY = "affiliate_ref";
const COURSE_KEY = "affiliate_ref_course";

export function getStoredAffiliateCode(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Course the stored referral code was issued for, if any. */
export function getStoredAffiliateCourseId(): string | null {
  try {
    return localStorage.getItem(COURSE_KEY);
  } catch {
    return null;
  }
}

/** Captures ?ref=CODE, stores it for attribution and logs one click. */
export function AffiliateTracker() {
  const location = useLocation();

  useEffect(() => {
    const code = new URLSearchParams(location.search).get("ref");
    if (!code) return;
    try {
      localStorage.setItem(KEY, code);
    } catch {
      /* storage unavailable */
    }
    const sessionKey = `aff_click_${code}`;
    const alreadyLogged = sessionStorage.getItem(sessionKey);
    sessionStorage.setItem(sessionKey, "1");

    (async () => {
      const { data } = await (supabase.rpc as any)("resolve_affiliate_ref", { p_code: code });
      const row = Array.isArray(data) ? data[0] : data;
      const affiliateId = row?.affiliate_id ?? row?.id;
      if (!affiliateId) return;
      // Keep the course attribution even when the visitor lands on a non-course page.
      try {
        if (row?.course_id) localStorage.setItem(COURSE_KEY, row.course_id);
        else localStorage.removeItem(COURSE_KEY);
      } catch {
        /* storage unavailable */
      }
      if (alreadyLogged) return;
      await supabase.from("affiliate_clicks").insert({
        affiliate_id: affiliateId,
        course_id: row?.course_id ?? null,
        landing_path: location.pathname,
        referrer: document.referrer || null,
      } as any);
    })();
  }, [location.search, location.pathname]);

  return null;
}