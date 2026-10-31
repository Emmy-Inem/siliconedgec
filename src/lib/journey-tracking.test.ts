import { beforeEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("./track-lead", () => ({ shouldSkipPassiveEvent: () => false }));
import { journeyPath, journeySession, trackJourney, JOURNEY_NOTICE_VERSION } from "./journey-tracking";
describe("optional journey privacy", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); rpc.mockClear(); });
  it("sends no event before consent", async () => { await trackJourney("page_view"); expect(rpc).not.toHaveBeenCalled(); });
  it("stops new events after consent withdrawal", async () => {
    localStorage.setItem("sec_journey_consent", JSON.stringify({ id: crypto.randomUUID(), version: JOURNEY_NOTICE_VERSION, accepted: true }));
    await trackJourney("page_view"); expect(rpc).toHaveBeenCalledTimes(1);
    localStorage.setItem("sec_journey_consent", JSON.stringify({ version: JOURNEY_NOTICE_VERSION, accepted: false }));
    await trackJourney("page_view"); expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("removes sensitive query strings and excludes admin routes", () => {
    expect(journeyPath("/courses/example?email=private#token")).toBe("/courses/example");
    expect(journeyPath("/admin/users")).toBeNull();
    expect(journeyPath("/orders/personal-reference")).toBe("/orders/:id");
    expect(journeyPath("/unknown/person@example.com")).toBeNull();
  });
  it("starts a fresh session after 30 minutes of inactivity", () => {
    const first = journeySession(0); expect(journeySession(29 * 60_000)).toBe(first);
    expect(journeySession(59 * 60_000)).not.toBe(first);
  });
});