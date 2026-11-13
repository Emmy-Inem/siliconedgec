/** Only app-local destinations may survive an authentication round trip. */
export function safeAuthRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\s\x00-\x1f]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://app.invalid');
    if (url.origin !== 'https://app.invalid') return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return '/'; }
}

export function rememberAuthRedirect(value: string): void {
  try { sessionStorage.setItem('sec_post_auth_redirect', safeAuthRedirect(value)); } catch { /* Storage may be disabled. */ }
}