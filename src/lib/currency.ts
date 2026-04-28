/**
 * Lightweight visitor-country detection + NGN→local currency conversion
 * for display only. Checkout still charges in NGN.
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

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  NG: "NGN",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  EG: "EGP",
  MA: "MAD",
  GB: "GBP",
  IE: "EUR",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  BE: "EUR",
  PT: "EUR",
  AT: "EUR",
  FI: "EUR",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  CH: "CHF",
  US: "USD",
  CA: "CAD",
  MX: "MXN",
  BR: "BRL",
  AR: "ARS",
  AE: "AED",
  SA: "SAR",
  PK: "PKR",
  IN: "INR",
  SG: "SGD",
  HK: "HKD",
  JP: "JPY",
  KR: "KRW",
  CN: "CNY",
  TH: "THB",
  PH: "PHP",
  AU: "AUD",
  NZ: "NZD",
};

/**
 * Fallback FX rates: 1 NGN = X foreign currency.
 * These are conservative defaults used only if the live rate fetch fails.
 * (Approximate rates, mid-2026.)
 */
export const FALLBACK_RATES_FROM_NGN: Record<string, number> = {
  NGN: 1,
  USD: 0.00067,
  EUR: 0.00062,
  GBP: 0.00053,
  CAD: 0.00092,
  AUD: 0.00102,
  NZD: 0.00112,
  CHF: 0.00060,
  SEK: 0.0070,
  NOK: 0.0072,
  DKK: 0.0046,
  GHS: 0.0098,
  KES: 0.087,
  ZAR: 0.012,
  EGP: 0.033,
  MAD: 0.0067,
  AED: 0.0025,
  SAR: 0.0025,
  PKR: 0.19,
  INR: 0.057,
  SGD: 0.00091,
  HKD: 0.0052,
  JPY: 0.10,
  KRW: 0.92,
  CNY: 0.0049,
  THB: 0.024,
  PHP: 0.039,
  MXN: 0.013,
  BRL: 0.0038,
  ARS: 0.65,
};

export function detectVisitorCountry(): string {
  if (typeof window === "undefined") return "NG";
  try {
    // 1) Cached IP-derived country (set by ensureGeoCountry)
    const cached = window.localStorage.getItem("sec_geo_country");
    if (cached && COUNTRY_TO_CURRENCY[cached]) return cached;
    // 2) Timezone heuristic (works for ~95% of visitors)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ_TO_COUNTRY[tz]) return TZ_TO_COUNTRY[tz];
    // 3) navigator.language fallback (e.g. "en-US")
    const lang = navigator.language || "en-NG";
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
    if (loc && COUNTRY_TO_CURRENCY[loc.toUpperCase()]) {
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
    const noDecimals = ["NGN", "JPY", "KRW", "PKR", "INR", "PHP", "THB", "KES", "ZAR", "EGP", "MAD", "GHS", "ARS"];
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency,
      maximumFractionDigits: noDecimals.includes(currency) ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(localAmount);
  } catch {
    return `${currency} ${Math.round(localAmount).toLocaleString()}`;
  }
}
