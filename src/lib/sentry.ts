/**
 * Sentry Error Reporting Helper
 * Dynamically loads and forwards exceptions to Sentry when VITE_SENTRY_DSN is configured.
 */
export function captureException(error: unknown, extra?: Record<string, unknown>) {
  const dsn = (import.meta as any).env?.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  import("@sentry/react")
    .then((Sentry) => {
      Sentry.captureException(error, { extra });
    })
    .catch((err) => {
      console.warn("Failed to report error to Sentry:", err);
    });
}
