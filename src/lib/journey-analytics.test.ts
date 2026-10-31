import { describe, expect, it } from "vitest";
import { reachPercent } from "./journey-analytics";
import { safeEvidence } from "../../supabase/functions/analytics-ai-summary/evidence";

describe("journey report evidence", () => {
  it("uses signup cohort as the independent milestone denominator", () => {
    expect(reachPercent(2, 5)).toBe(40);
    expect(reachPercent(0, 0)).toBe(0);
  });
  it("never passes personal paths, query values or raw identifiers to AI", () => {
    const evidence = safeEvidence({ signups: 5, pages: [{ page: "/courses/person@example.com?token=secret", views: 3 }], email: "person@example.com" }, { endpoints: [{ path: "/orders/private-person", sessions: 1 }], user_id: "private-person" });
    expect(evidence.topPages).toEqual([{ page: "courses", views: 3 }]);
    expect(evidence.lastPages).toEqual([{ page: "Other pages", sessions: 1 }]);
    expect(JSON.stringify(evidence)).not.toMatch(/secret|private-person|person@example/);
  });
});