import { COUNTRY_TO_CURRENCY, FALLBACK_RATES_FROM_NGN, currencyFactor } from "../../supabase/functions/_shared/currency-config";
export { COUNTRY_TO_CURRENCY, FALLBACK_RATES_FROM_NGN };
/**
 * Lightweight visitor-country detection + NGN→local currency conversion
 * shared by price displays and checkout currency selection.
 */

// Minimal IANA timezone → ISO country code map for the most common visitors.
// Anything not in the map falls back to USD.
const TZ_TO_COUNTRY: Record<string, string> = {
  "Africa/Lagos": "NG",
  "Africa/Accra": "GH",
  "Africa/Nairobi": "KE",
  "Africa/Johannesburg": "ZA",
  "Africa/Cairo": "EG",
  "Africa/Casablanca": "MA",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Zurich": "CH",
  "Europe/Vienna": "AT",
  "Europe/Lisbon": "PT",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "America/Buenos_Aires": "AR",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Singapore": "SG",
  "Asia/Hong_Kong": "HK",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Bangkok": "TH",
  "Asia/Manila": "PH",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Pacific/Auckland": "NZ",
};



/**
 * Fallback FX rates: 1 NGN = X foreign currency.
 * These are conservative defaults used only if the live rate fetch fails.
 * (Approximate rates, mid-2026.)
 */


export function detectVisitorCountry(): string {
  if (typeof window === "undefined") return "US";
  try {
    // 1) Cached IP-derived country (set by ensureGeoCountry)
    const cached = window.localStorage.getItem("sec_geo_country");
    const cachedAt = Number(window.localStorage.getItem("sec_geo_at") || 0);
    if (cached && Date.now() - cachedAt < 24 * 60 * 60 * 1000) return cached;
    // 2) Timezone heuristic (works for ~95% of visitors)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ_TO_COUNTRY[tz]) return TZ_TO_COUNTRY[tz];
    // 3) navigator.language fallback (e.g. "en-US")
    const lang = navigator.language || "en-US";
    const region = lang.split("-")[1];
    if (region && COUNTRY_TO_CURRENCY[region.toUpperCase()]) return region.toUpperCase();
  } catch {
    /* ignore */
  }
  return "US";
}

export function detectVisitorCurrency(): string {
  const country = detectVisitorCountry();
  return COUNTRY_TO_CURRENCY[country] ?? "USD";
}

/**
 * Best-effort IP geolocation. Caches result in localStorage for 24h so we
 * never block render. Falls through silently on any failure (timezone
 * detection still applies).
 */
export async function ensureGeoCountry(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const cachedAt = Number(window.localStorage.getItem("sec_geo_at") || 0);
    const cached = window.localStorage.getItem("sec_geo_country");
    const fresh = cached && Date.now() - cachedAt < 24 * 60 * 60 * 1000;
    if (fresh && cached) return cached;

    // Cloudflare's free trace endpoint — no key, fast, CORS-enabled.
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error("trace http");
    const text = await res.text();
    const loc = text.split("\n").find((l) => l.startsWith("loc="))?.split("=")[1]?.trim();
    if (loc && /^[A-Z]{2}$/i.test(loc)) {
      const code = loc.toUpperCase();
      window.localStorage.setItem("sec_geo_country", code);
      window.localStorage.setItem("sec_geo_at", String(Date.now()));
      return code;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function formatLocalized(amountNgn: number, currency: string, rateFromNgn: number, locale?: string): string {
  if (!Number.isFinite(amountNgn) || amountNgn <= 0) return "Free";
  const localAmount = amountNgn * rateFromNgn;
  const loc = locale || (typeof navigator !== "undefined" ? navigator.language : "en-US");
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency,
      maximumFractionDigits: currencyFactor(currency) === 1 || ["ISK", "UGX"].includes(currency) ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(localAmount);
  } catch {
    return `${currency} ${Math.round(localAmount).toLocaleString()}`;
  }
}
