/** Private, personal and transactional routes are not search landing pages. */
export function isPrivateSearchPage(pathname: string): boolean {
  return /^\/(admin|instructor|dashboard|account|orders|cart|sign-in|sign-up|forgot-password|reset-password|verify-receipt|bookmarks|wishlist|refer|newsletter|cohorts|bootcamp|support|quizzes|r|search|error|500)(\/|$)/.test(pathname)
    || /^\/career\/dashboard(\/|$)/.test(pathname)
    || /^\/verify\/.+/.test(pathname)
    || /^\/courses\/[^/]+\/(learn|quizzes|assignments)(\/|$)/.test(pathname);
}

export function canonicalPageUrl(pathname: string, supplied?: string): string {
  const origin = "https://siliconedgec.com";
  try {
    const url = new URL(supplied || pathname, `${origin}/`);
    return `${origin}${url.pathname}`;
  } catch {
    return `${origin}${pathname}`;
  }
}

/** Do not send email prefills, reset tokens or payment references to Google. */
export function analyticsPagePath(pathname: string, search: string): string {
  const input = new URLSearchParams(search);
  const safe = new URLSearchParams();
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "category"]) {
    const value = input.get(key);
    if (value) safe.set(key, value);
  }
  const query = safe.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}