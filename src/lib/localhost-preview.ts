/**
 * Helper to ensure experimental or staged features only appear in localhost/preview
 * environments until ready for production deployment.
 */
export function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  );
}

/**
 * Determines whether a staged feature should be displayed.
 * If localhostOnly is true (default), it strictly checks isLocalhost().
 */
export function shouldShowStagedFeature(localhostOnly: boolean = true): boolean {
  if (typeof window === "undefined") return false;
  
  // Explicit preview query parameter override for administrative testing
  const params = new URLSearchParams(window.location.search);
  if (params.get("preview_mode") === "true") {
    return true;
  }

  if (localhostOnly) {
    return isLocalhost();
  }

  return true;
}
