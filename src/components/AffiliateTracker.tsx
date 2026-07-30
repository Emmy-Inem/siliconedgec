import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const KEY = "affiliate_ref";

export function getStoredAffiliateCode(): string | null {
  try {
    return localStorage.getItem(KEY);
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
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");

    (async () => {
      const { data } = await (supabase.rpc as any)("resolve_affiliate_code", { p_code: code });
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) return;
      await supabase.from("affiliate_clicks").insert({
        affiliate_id: row.id,
        landing_path: location.pathname,
        referrer: document.referrer || null,
      } as any);
    })();
  }, [location.search, location.pathname]);

  return null;
}