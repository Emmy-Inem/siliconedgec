const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Date range in the viewer's own timezone, so "Today" matches their clock. */
export function analyticsRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || +end <= +start) return null;
  let p_tz = "UTC";
  try { p_tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { /* keep UTC */ }
  return { p_from: start.toISOString(), p_to: end.toISOString(), p_tz };
}

export function analyticsPreset(days: number, now = new Date()) {
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  return { from: localDate(start), to: localDate(now) };
}

let fallbackVisitor: string | undefined;
export function analyticsVisitorId() {
  try {
    const saved = localStorage.getItem("sec_analytics_visitor");
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem("sec_analytics_visitor", id);
    return id;
  } catch {
    fallbackVisitor ??= crypto.randomUUID();
    return fallbackVisitor;
  }
}

export interface AudienceAnalytics {
  signups: number;
  visitors: number;
  pageviews: number;
  unidentifiedViews: number;
  loggedInPeople: number;
  pages: { page: string; views: number; visitors?: number }[];
  courses?: { name: string; views: number; visitors: number }[];
  countries: { name: string; views: number; visitors: number }[];
  devices: { name: string; views: number }[];
  sources: { name: string; views: number }[];
  daily: { day: string; signups: number; views: number; visitors?: number; logins: number }[];
}