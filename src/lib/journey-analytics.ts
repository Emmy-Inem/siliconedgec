export interface JourneyAnalytics {
  cohortSize: number;
  observedPeople: number;
  stages: { stage: string; people: number; position: number }[];
  endpoints: { path: string; sessions: number }[];
  transitions: { from_page: string; to_page: string; transitions: number }[];
  friction: { path: string; reason: string; events: number; people: number }[];
  checkoutWithoutPayment: number;
  trackingSince: string | null;
}

export function reachPercent(people: number, cohort: number) {
  return cohort > 0 ? Math.round(people / cohort * 100) : 0;
}

export function journeyPageLabel(path: string) {
  if (path === "/") return "Home";
  return path.replace(/^\//, "").replace(/-/g, " ").replace(/\//g, " / ");
}