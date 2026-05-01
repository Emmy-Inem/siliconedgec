import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyGadsLabelOverrides, GADS_LABELS_KEY, type GoogleAdsEventKey } from "@/lib/analytics";

/**
 * Hydrates Google Ads conversion-label overrides from `site_content` into
 * `window.__gadsLabelOverrides`, where `googleAdsConversion()` reads them
 * synchronously on every fire. Also caches in localStorage so the very
 * first conversion after a hard reload still benefits from the overrides
 * (avoids a race with the network round-trip).
 */
export function GadsLabelsLoader() {
  useEffect(() => {
    // 1. Apply cached value immediately (no network race)
    try {
      const cached = localStorage.getItem(GADS_LABELS_KEY);
      if (cached) applyGadsLabelOverrides(JSON.parse(cached));
    } catch { /* ignore */ }

    // 2. Refresh from server in the background
    (async () => {
      try {
        const { data } = await supabase
          .from("site_content")
          .select("value")
          .eq("key", GADS_LABELS_KEY)
          .maybeSingle();
        if (data?.value) {
          const parsed = JSON.parse(data.value) as Partial<Record<GoogleAdsEventKey, string>>;
          applyGadsLabelOverrides(parsed);
          try { localStorage.setItem(GADS_LABELS_KEY, JSON.stringify(parsed)); } catch { /* ignore */ }
        }
      } catch { /* tolerate offline / RLS */ }
    })();
  }, []);
  return null;
}