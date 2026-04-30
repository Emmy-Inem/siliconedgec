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

/** Send a SPA pageview to GA4. GA's IP-based geolocation runs server-side
 *  on every event, so this is what unlocks real country/region/device data
 *  in the GA4 Reports → Demographics / Tech sections. */
export function gaPageview(path: string, title?: string) {
  safeGtag("event", "page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : path,
    page_title: title ?? (typeof document !== "undefined" ? document.title : undefined),
  });
}

/** Generic GA4 event. Use sparingly — most analytics live in `lead_sources`. */
export function gaEvent(name: string, params: Record<string, unknown> = {}) {
  safeGtag("event", name, params);
}

/** Set user_id on GA4 once they sign in, so funnels can join across devices. */
export function gaSetUserId(userId: string | null) {
  safeGtag("set", { user_id: userId ?? undefined });
}