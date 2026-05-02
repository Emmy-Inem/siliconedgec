/**
 * Lightweight, key-less visitor geo lookup.
 *
 * We hit Cloudflare's `/cdn-cgi/trace` endpoint which returns the visitor's
 * country code (e.g. `loc=US`) based on the edge POP they hit — no API key,
 * no rate limit issues, and CORS-friendly. The result is cached in
 * sessionStorage so we make at most one call per tab.
 *
 * If Cloudflare is blocked (corporate networks, ad blockers, in-app browsers
 * with restricted networking on iOS), we fall back to `ipapi.co` once. If
 * both fail we return `null` and the caller is responsible for not faking it.
 */

const SESSION_KEY = "sec_visitor_geo_v1";

export interface VisitorGeo {
  country: string | null;       // ISO-3166 alpha-2, e.g. "NG", "US"
  region: string | null;        // best-effort, may be null from Cloudflare
  city: string | null;          // best-effort
  source: "cloudflare" | "ipapi" | "cache" | "unavailable";
}

let inflight: Promise<VisitorGeo | null> | null = null;

function readCache(): VisitorGeo | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VisitorGeo;
    if (parsed && typeof parsed === "object" && "country" in parsed) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(geo: VisitorGeo) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(geo)); } catch { /* ignore */ }
}

async function fromCloudflare(): Promise<VisitorGeo | null> {
  try {
    const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", {
      method: "GET",
      cache: "no-store",
      // Don't send credentials — keeps the call lightweight and ITP-safe.
      credentials: "omit",
    });
    if (!res.ok) return null;
    const text = await res.text();
    const map: Record<string, string> = {};
    text.split("\n").forEach((line) => {
      const idx = line.indexOf("=");
      if (idx > 0) map[line.slice(0, idx)] = line.slice(idx + 1);
    });
    const country = (map.loc || "").trim().toUpperCase() || null;
    if (!country) return null;
    return { country, region: null, city: null, source: "cloudflare" };
  } catch {
    return null;
  }
}

async function fromIpApi(): Promise<VisitorGeo | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { cache: "no-store", credentials: "omit" });
    if (!res.ok) return null;
    const data = await res.json();
    const country = (data.country_code || data.country || "").trim().toUpperCase() || null;
    if (!country) return null;
    return {
      country,
      region: typeof data.region === "string" ? data.region : null,
      city: typeof data.city === "string" ? data.city : null,
      source: "ipapi",
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the visitor's geo (country code at minimum). Returns the cached
 * value when available so callers can use it synchronously across many events.
 */
export async function getVisitorGeo(): Promise<VisitorGeo | null> {
  const cached = readCache();
  if (cached) return { ...cached, source: "cache" };
  if (inflight) return inflight;

  inflight = (async () => {
    // Prefer ipapi because it returns city + region (Cloudflare only gives
    // country). If ipapi is blocked / rate-limited we fall back to Cloudflare
    // so we at least record the country.
    const ip = await fromIpApi();
    if (ip) { writeCache(ip); return ip; }
    const cf = await fromCloudflare();
    if (cf) { writeCache(cf); return cf; }
    const fallback: VisitorGeo = { country: null, region: null, city: null, source: "unavailable" };
    writeCache(fallback);
    return fallback;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Synchronous read of cached geo — use after `getVisitorGeo()` has resolved once. */
export function getCachedVisitorGeo(): VisitorGeo | null {
  return readCache();
}