/**
 * Lightweight, key-less visitor geo lookup.
 *
 * Resolution order:
 *   1. ipapi.co — gives us city + region + country (best signal)
 *   2. ipwho.is — secondary provider, also returns city/region
 *   3. Cloudflare /cdn-cgi/trace — country only, but rarely blocked
 *
 * Successful lookups are cached in localStorage with a 24h TTL so we make
 * one network call per visitor per day across tabs. A failed/unknown lookup
 * is cached for only 30 minutes and never poisons the cache as "Unknown",
 * so a transient ad-blocker / network blip can recover on the next visit.
 */

const STORAGE_KEY = "sec_visitor_geo_v2";
const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;   // 24 hours for resolved geo
const FAILURE_TTL_MS = 30 * 60 * 1000;        // 30 min for "unavailable"

export interface VisitorGeo {
  country: string | null;       // ISO-3166 alpha-2, e.g. "NG", "US"
  region: string | null;        // best-effort, may be null from Cloudflare
  city: string | null;          // best-effort
  source: "cloudflare" | "ipapi" | "ipwho" | "cache" | "unavailable";
}

let inflight: Promise<VisitorGeo | null> | null = null;

interface CacheEnvelope { v: VisitorGeo; exp: number }

function readCache(): VisitorGeo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (!parsed?.v || typeof parsed.exp !== "number") return null;
    if (Date.now() > parsed.exp) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
}

function writeCache(geo: VisitorGeo) {
  try {
    const ttl = geo.country ? SUCCESS_TTL_MS : FAILURE_TTL_MS;
    const env: CacheEnvelope = { v: geo, exp: Date.now() + ttl };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
  } catch { /* ignore */ }
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

async function fromIpWho(): Promise<VisitorGeo | null> {
  // Secondary provider: city + region + country, no key, generous CORS.
  try {
    const res = await fetch("https://ipwho.is/", { cache: "no-store", credentials: "omit" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success === false) return null;
    const country = (data.country_code || "").trim().toUpperCase() || null;
    if (!country) return null;
    return {
      country,
      region: typeof data.region === "string" ? data.region : null,
      city: typeof data.city === "string" ? data.city : null,
      source: "ipwho",
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
    // Prefer providers that return city + region. If both fail (ad blockers,
    // in-app browsers), fall back to Cloudflare for country-only.
    const ip = await fromIpApi();
    if (ip) { writeCache(ip); return ip; }
    const ipw = await fromIpWho();
    if (ipw) { writeCache(ipw); return ipw; }
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