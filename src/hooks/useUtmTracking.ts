import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const STORAGE_KEY = "sec_utm_params";
const LEGACY_KEY = "utm_attribution"; // Older key written by RedirectInfluencer
const COOKIE_DAYS = 30;

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

function setWithExpiry(key: string, value: UtmParams) {
  const item = {
    value,
    expiry: Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

function getWithExpiry(key: string): UtmParams | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const item = JSON.parse(raw);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch {
    return null;
  }
}

/**
 * Read UTM params with legacy-key fallback. Older flows (RedirectInfluencer)
 * wrote into "utm_attribution" with a different shape — merge those in too so
 * influencer attribution survives across the app.
 */
export function getStoredUtmParams(): UtmParams {
  const fromNew = getWithExpiry(STORAGE_KEY) ?? {};
  if (Object.keys(fromNew).length > 0) return fromNew;

  // Legacy flat shape: { utm_source, utm_medium, ... captured_at }
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const out: UtmParams = {};
    UTM_KEYS.forEach((k) => {
      if (parsed?.[k]) out[k] = String(parsed[k]);
    });
    return out;
  } catch {
    return {};
  }
}

export function useUtmTracking() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const utmFromUrl: UtmParams = {};
    let hasUtm = false;

    UTM_KEYS.forEach((key) => {
      const val = params.get(key);
      if (val) {
        utmFromUrl[key] = val;
        hasUtm = true;
      }
    });

    if (hasUtm) {
      // Merge with existing, new params override
      const existing = getStoredUtmParams();
      setWithExpiry(STORAGE_KEY, { ...existing, ...utmFromUrl });
    }
  }, [location.search]);

  return getStoredUtmParams();
}
