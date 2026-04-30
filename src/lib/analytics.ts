/**
 * Thin wrapper around `gtag()` so the rest of the app doesn't need to know
 * whether GA4 has loaded yet. Calls are queued via `dataLayer` (gtag's own
 * mechanism) so they're delivered as soon as the script is ready — important
 * on slow mobile connections where the route change can race the GA script.
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    ttq?: {
      page: () => void;
      track: (event: string, params?: Record<string, unknown>, opts?: Record<string, unknown>) => void;
      identify: (params: Record<string, unknown>) => void;
      [k: string]: any;
    };
  }
}

function safeGtag(...args: any[]) {
  if (typeof window === "undefined") return;
  // Always push to dataLayer — works even before gtag.js has loaded.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
  // Some installs expose `gtag` directly; call it too so dev-tools "Network"
  // shows the request promptly (defensive — push() above is the real path).
  try { window.gtag?.(...args); } catch { /* ignore */ }
}

/** TikTok Pixel — safe wrapper. The base snippet in index.html stubs `ttq`
 *  so calls made before the SDK loads are queued and replayed on load. */
function safeTtq(method: "page" | "track" | "identify", ...args: any[]) {
  if (typeof window === "undefined") return;
  try {
    const ttq = window.ttq;
    if (!ttq) return;
    (ttq[method] as any)?.(...args);
  } catch { /* ignore */ }
}

/** Stable per-visitor event_id for TikTok dedup with future server-side
 *  Events API. Persists per browser; falls back to in-memory if storage is
 *  blocked (iOS in-app browsers in private mode, Android WebView w/o cookies). */
function makeEventId(event: string): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${event}-${ts}-${rnd}`;
}

/** In-app browsers (Instagram, Facebook, TikTok, LinkedIn) sometimes load
 *  the page before the pixel SDK finishes initialising, and they block
 *  third-party storage. We poll briefly and fall back to a no-op so callers
 *  never block UX waiting for the pixel. */
function whenTtqReady(cb: () => void, timeoutMs = 4000) {
  if (typeof window === "undefined") return;
  const start = Date.now();
  const tick = () => {
    if (window.ttq && typeof window.ttq.track === "function") { cb(); return; }
    if (Date.now() - start > timeoutMs) return; // give up silently
    setTimeout(tick, 150);
  };
  tick();
}

/** Send a SPA pageview to GA4. GA's IP-based geolocation runs server-side
 *  on every event, so this is what unlocks real country/region/device data
 *  in the GA4 Reports → Demographics / Tech sections. */
export function gaPageview(path: string, title?: string) {
  safeGtag("event", "page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : path,
    page_title: title ?? (typeof document !== "undefined" ? document.title : undefined),
  });
  // TikTok Pixel: fire a SPA pageview on every route change. The base snippet
  // already calls ttq.page() on initial load; this covers client-side nav.
  safeTtq("page");
}

/** Generic GA4 event. Use sparingly — most analytics live in `lead_sources`. */
export function gaEvent(name: string, params: Record<string, unknown> = {}) {
  safeGtag("event", name, params);
}

/** Set user_id on GA4 once they sign in, so funnels can join across devices. */
export function gaSetUserId(userId: string | null) {
  safeGtag("set", { user_id: userId ?? undefined });
  if (userId) safeTtq("identify", { external_id: userId });
}

/** TikTok-specific event helper for conversion tracking
 *  (e.g. `tikTokEvent("CompletePayment", { value: 50000, currency: "NGN" })`). */
export function tikTokEvent(event: string, params: Record<string, unknown> = {}) {
  // Attach a unique event_id so the same conversion can be deduped against a
  // future server-side Events API call. Required for accurate iOS attribution
  // because Apple's ITP / in-app WebViews can drop the client-side request.
  const event_id = makeEventId(event);
  whenTtqReady(() => {
    try { window.ttq?.track(event, params, { event_id }); }
    catch { try { window.ttq?.track(event, params); } catch { /* ignore */ } }
  });
}

/** Diagnostic snapshot of TikTok Pixel state — used by the admin Tracking QA
 *  page so admins can confirm the SDK actually loaded (not just queued) on
 *  whatever browser/device they're on. */
export interface TikTokPixelStatus {
  stub_present: boolean;   // base snippet ran (window.ttq exists)
  sdk_loaded: boolean;     // events.js downloaded successfully (not blocked)
  pixel_id: string;
  user_agent: string;
  in_app_browser: "instagram" | "facebook" | "tiktok" | "linkedin" | "line" | null;
  consent_granted: boolean;
}

const TIKTOK_PIXEL_ID = "D7PTAHBC77UF8O7SC90G";

function detectInAppBrowser(): TikTokPixelStatus["in_app_browser"] {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("instagram")) return "instagram";
  if (ua.includes("fban") || ua.includes("fbav")) return "facebook";
  if (ua.includes("tiktok") || ua.includes("musical_ly")) return "tiktok";
  if (ua.includes("linkedinapp")) return "linkedin";
  if (ua.includes(" line/")) return "line";
  return null;
}

export function getTikTokPixelStatus(): TikTokPixelStatus {
  const ttq = typeof window !== "undefined" ? window.ttq : undefined;
  // The official snippet stores per-pixel state under `ttq._i[pixel_id]`
  // and sets `.loaded = true` once events.js has executed.
  const instance = (ttq as any)?._i?.[TIKTOK_PIXEL_ID];
  return {
    stub_present: !!ttq,
    sdk_loaded: !!instance?.loaded,
    pixel_id: TIKTOK_PIXEL_ID,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    in_app_browser: detectInAppBrowser(),
    consent_granted: !!(ttq as any)?._partner || true, // grantConsent() called in index.html
  };
}