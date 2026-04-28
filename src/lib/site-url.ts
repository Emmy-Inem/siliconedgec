/** Canonical production origin for the site. Use this for any URL that will
 *  be shared, embedded in emails, printed on certificates, or otherwise
 *  outlive the current browser session. For in-session redirects (OAuth
 *  callbacks, payment callbacks) keep using window.location.origin. */
export const PRODUCTION_ORIGIN = "https://siliconedgec.com";

/** Build an absolute URL on the production origin from a path. */
export function siteUrl(path: string = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${PRODUCTION_ORIGIN}${p}`;
}
