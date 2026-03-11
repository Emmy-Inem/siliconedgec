import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const STORAGE_KEY = "sec_utm_params";
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

export function getStoredUtmParams(): UtmParams {
  return getWithExpiry(STORAGE_KEY) ?? {};
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
