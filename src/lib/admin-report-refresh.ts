/** In-memory report caching only; explicit refreshes and save invalidations still fetch. */
export const ADMIN_REPORT_REFRESH_MS = 24 * 60 * 60 * 1000;

export const adminReportRefresh = {
  refetchInterval: ADMIN_REPORT_REFRESH_MS,
  staleTime: ADMIN_REPORT_REFRESH_MS,
  gcTime: ADMIN_REPORT_REFRESH_MS,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchIntervalInBackground: false,
} as const;