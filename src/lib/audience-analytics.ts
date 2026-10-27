export function analyticsRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || +end <= +start) return null;
  return { p_from: start.toISOString(), p_to: end.toISOString() };
}

export function analyticsPreset(days: number, now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
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
  pages: { page: string; views: number }[];
  countries: { name: string; views: number; visitors: number }[];
  devices: { name: string; views: number }[];
  sources: { name: string; views: number }[];
  daily: { day: string; signups: number; views: number; logins: number }[];
}