// AI receives counts and route categories, never arbitrary stored paths or identifiers.
export function safeEvidence(audience: Record<string, any>, journey: Record<string, any>) {
  const count = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
  const page = (value: unknown) => {
    const path = typeof value === "string" ? value.split(/[?#]/)[0] : "";
    if (path === "/") return "Home";
    const root = path.split("/")[1];
    return ["courses", "cart", "pricing", "instructors", "about", "sign-in", "sign-up", "dashboard", "learning", "contact", "business", "blog"].includes(root) ? root : "Other pages";
  };
  return {
    signups: count(audience.signups), recordedVisitors: count(audience.visitors), logins: count(audience.loggedInPeople), pageviews: count(audience.pageviews),
    newLearners: count(journey.cohortSize), recordedJourneyPeople: count(journey.observedPeople), unpaidCheckoutAfter24h: count(journey.checkoutWithoutPayment),
    milestones: (journey.stages || []).map((s: any) => ({ stage: ["Signed up", "Recorded activity", "Viewed a course", "Opened cart", "Started checkout", "Paid", "Learning activity"].includes(s.stage) ? s.stage : "Other", people: count(s.people) })),
    lastPages: (journey.endpoints || []).map((s: any) => ({ page: page(s.path), sessions: count(s.sessions) })),
    friction: (journey.friction || []).map((s: any) => ({ page: page(s.path), reason: ["validation", "authentication", "payment_setup", "payment_verification"].includes(s.reason) ? s.reason : "Other error", events: count(s.events) })),
    topPages: (audience.pages || []).slice(0, 10).map((s: any) => ({ page: page(s.page), views: count(s.views) })),
    trackingStarted: Boolean(journey.trackingSince),
  };
}