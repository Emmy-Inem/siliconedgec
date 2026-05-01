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
    fbq?: ((...args: any[]) => void) & {
      loaded?: boolean;
      version?: string;
      queue?: any[];
      callMethod?: (...args: any[]) => void;
    };
    _fbq?: any;
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

// ───── Event-ID observability ───────────────────────────────────────────
// Every TikTok / Meta conversion gets a unique event_id used for server-side
// Conversions API dedup. We mirror those IDs into a per-tab ring buffer so
// the admin Tracking QA panel (and curious devs in DevTools) can confirm
// a conversion actually fired with the right id, even when an ad-blocker
// hides the network request from the user's view.

export interface PixelEventLogEntry {
  ts: number;
  vendor: "tiktok" | "meta" | "google";
  event: string;
  event_id: string;
  params: Record<string, unknown>;
}

const EVENT_LOG_LIMIT = 50;
const EVENT_LOG: PixelEventLogEntry[] = [];
const EVENT_LOG_LISTENERS = new Set<(log: readonly PixelEventLogEntry[]) => void>();

function logPixelEvent(entry: PixelEventLogEntry) {
  EVENT_LOG.unshift(entry);
  if (EVENT_LOG.length > EVENT_LOG_LIMIT) EVENT_LOG.length = EVENT_LOG_LIMIT;
  // Surface to DevTools so devs can grep `[Pixel]` to follow a conversion
  // through the TikTok / Meta network beacons.
  try {
    // eslint-disable-next-line no-console
    console.info(
      `[Pixel] ${entry.vendor}.${entry.event} event_id=${entry.event_id}`,
      entry.params
    );
  } catch { /* ignore */ }
  // Also expose on `window` so admins can run `window.__pixelLog` in
  // DevTools to inspect history without opening the admin panel.
  try {
    (window as any).__pixelLog = EVENT_LOG;
  } catch { /* ignore */ }
  EVENT_LOG_LISTENERS.forEach((cb) => { try { cb(EVENT_LOG); } catch { /* ignore */ } });
}

/** Read the current pixel event log (newest first). */
export function getPixelEventLog(): readonly PixelEventLogEntry[] {
  return EVENT_LOG;
}

/** Subscribe to live updates. Returns an unsubscribe function. */
export function subscribePixelEventLog(cb: (log: readonly PixelEventLogEntry[]) => void): () => void {
  EVENT_LOG_LISTENERS.add(cb);
  return () => { EVENT_LOG_LISTENERS.delete(cb); };
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

/** True once events.js has actually downloaded and replaced the queued
 *  stub. The TikTok base snippet doesn't expose a `.loaded` flag — instead
 *  we check three real signals:
 *    1. A <script> tag for `events.js` exists in the DOM and has finished
 *       executing (no `data-loading` / readyState pending).
 *    2. The post-load SDK exposes `ttq.instance(id)` returning a real
 *       object whose `track` is a function (the stub stores `track` on the
 *       queue array as `setAndDefer`, but the live SDK replaces it).
 *    3. As a final fallback, if `ttq._partner` got populated (the live SDK
 *       sets it during init), we know events.js ran.
 *  Any one of these is sufficient — we use OR semantics so a strict
 *  ad-blocker that strips one signal but not the others still passes. */
function isTtqSdkLoaded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ttq: any = window.ttq;
    if (!ttq) return false;
    // Signal 1 — events.js script tag is in the DOM and not still loading.
    const scripts = document.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      const s = scripts[i] as HTMLScriptElement;
      if (s.src && s.src.indexOf("analytics.tiktok.com/i18n/pixel/events.js") !== -1) {
        // `readyState` is IE-only; in modern browsers a script that
        // finished executing has no pending state we can observe directly.
        // Presence + lack of `data-failed` is a strong positive signal.
        if (!(s as any).dataset?.failed) return true;
      }
    }
    // Signal 2 — live SDK populated `_partner` or replaced `instance()`
    if (ttq._partner) return true;
    if (typeof ttq.instance === "function") {
      const inst = ttq.instance(TIKTOK_PIXEL_ID);
      // The live SDK's instance returns an object with a numeric `_t`.
      if (inst && typeof inst === "object" && (inst.identify || inst._sodar)) return true;
    }
    return false;
  } catch { return false; }
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
  // We wrap in `whenTtqReady` so in-app WebViews that load the SDK slowly
  // don't drop the very first SPA navigation (common when users land on
  // `/` and immediately tap a CTA before the 3rd-party script finishes).
  whenTtqReady(() => safeTtq("page"));
  // Meta (Facebook) Pixel SPA pageview. fbq() queues calls before the SDK
  // is ready, so no readiness check is needed.
  metaPageview();
}

/** Generic GA4 event. Use sparingly — most analytics live in `lead_sources`. */
export function gaEvent(name: string, params: Record<string, unknown> = {}) {
  safeGtag("event", name, params);
}

/** Set user_id on GA4 once they sign in, so funnels can join across devices. */
export function gaSetUserId(userId: string | null) {
  safeGtag("set", { user_id: userId ?? undefined });
  if (userId) safeTtq("identify", { external_id: userId });
  // Meta advanced matching — passing an external_id helps Meta tie
  // conversions to the same user across devices when cookies are blocked.
  if (userId) safeFbq("init", META_PIXEL_ID, { external_id: userId });
}

/** TikTok-specific event helper for conversion tracking
 *  (e.g. `tikTokEvent("CompletePayment", { value: 50000, currency: "NGN" })`). */
export function tikTokEvent(event: string, params: Record<string, unknown> = {}) {
  // Attach a unique event_id so the same conversion can be deduped against a
  // future server-side Events API call. Required for accurate iOS attribution
  // because Apple's ITP / in-app WebViews can drop the client-side request.
  const event_id = makeEventId(event);
  logPixelEvent({ ts: Date.now(), vendor: "tiktok", event, event_id, params });
  whenTtqReady(() => {
    try { window.ttq?.track(event, params, { event_id }); }
    catch { try { window.ttq?.track(event, params); } catch { /* ignore */ } }
  });
}

// ───── Meta (Facebook) Pixel ────────────────────────────────────────────
// The base snippet in index.html stubs `window.fbq` so calls before the
// SDK is ready are queued and replayed once fbevents.js loads — we still
// guard every call to avoid throwing if a privacy extension nuked `fbq`.

const META_PIXEL_ID = "802223455823137";

function safeFbq(...args: any[]) {
  if (typeof window === "undefined") return;
  try { window.fbq?.(...args); } catch { /* ignore */ }
}

/** Send a Meta Pixel `PageView` for SPA route changes. The base snippet
 *  fires the initial PageView; this covers client-side nav. */
export function metaPageview() {
  safeFbq("track", "PageView");
}

/** Standard Meta Pixel event. Use the canonical event names where
 *  possible (AddToCart, InitiateCheckout, Purchase, CompleteRegistration,
 *  Lead, ViewContent) — they unlock Meta Ads optimisation. Pass an
 *  `eventID` so server-side Conversions API calls can dedup later. */
export function metaEvent(event: string, params: Record<string, unknown> = {}) {
  const eventID = makeEventId(event);
  logPixelEvent({ ts: Date.now(), vendor: "meta", event, event_id: eventID, params });
  // Meta accepts the eventID as the 3rd-position options object.
  safeFbq("track", event, params, { eventID });
}

/** Custom (non-standard) Meta event — used for things Meta doesn't have a
 *  canonical name for, e.g. `DownloadCertificate`. */
export function metaCustomEvent(event: string, params: Record<string, unknown> = {}) {
  const eventID = makeEventId(event);
  logPixelEvent({ ts: Date.now(), vendor: "meta", event: `${event} (custom)`, event_id: eventID, params });
  safeFbq("trackCustom", event, params, { eventID });
}

function isFbqSdkLoaded(): boolean {
  if (typeof window === "undefined") return false;
  try { return !!window.fbq?.loaded; } catch { return false; }
}

export interface MetaPixelStatus {
  stub_present: boolean;
  sdk_loaded: boolean;
  pixel_id: string;
  user_agent: string;
  in_app_browser: TikTokPixelStatus["in_app_browser"];
}

export function getMetaPixelStatus(): MetaPixelStatus {
  return {
    stub_present: typeof window !== "undefined" && !!window.fbq,
    sdk_loaded: isFbqSdkLoaded(),
    pixel_id: META_PIXEL_ID,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    in_app_browser: detectInAppBrowser(),
  };
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
  return {
    stub_present: !!ttq,
    sdk_loaded: isTtqSdkLoaded(),
    pixel_id: TIKTOK_PIXEL_ID,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    in_app_browser: detectInAppBrowser(),
    consent_granted: !!(ttq as any)?._partner || true, // grantConsent() called in index.html
  };
}