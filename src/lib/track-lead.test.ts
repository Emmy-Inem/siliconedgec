import { describe, it, expect, vi, beforeEach } from "vitest";
import { shouldSkipPassiveEvent, trackLead } from "./track-lead";

const { getUser } = vi.hoisted(() => ({
  getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser } },
}));

const UA = "Mozilla/5.0 (Windows NT 10.0) Chrome/120";

describe("shouldSkipPassiveEvent", () => {
  it("skips pageviews on the preview host", () => {
    expect(shouldSkipPassiveEvent("pageview", "id-preview--abc.lovable.app", UA)).toBe(true);
  });
  it("records pageviews on the live domain", () => {
    expect(shouldSkipPassiveEvent("pageview", "siliconedgec.com", UA)).toBe(false);
  });
  it("skips pageviews from crawlers", () => {
    expect(shouldSkipPassiveEvent("pageview", "siliconedgec.com", "Googlebot/2.1")).toBe(true);
  });
  it("always records real leads, even on preview", () => {
    expect(shouldSkipPassiveEvent("business_lead", "id-preview--abc.lovable.app", UA)).toBe(false);
  });
  it.each(["pageview", "page_visit", "auth_signin_view", "auth_signup_view", "auth_forgot_password_view", "auth_reset_password_view"])(
    "skips %s on localhost", (formType) => {
      expect(shouldSkipPassiveEvent(formType, "localhost", UA)).toBe(true);
    },
  );
  it("keeps live campaign visits eligible for attribution", () => {
    expect(shouldSkipPassiveEvent("page_visit", "siliconedgec.com", UA)).toBe(false);
  });
  it("excludes campaign visits from crawlers", () => {
    expect(shouldSkipPassiveEvent("page_visit", "siliconedgec.com", "Googlebot")).toBe(true);
  });
  it("keeps genuine submissions eligible even with a crawler-like user agent", () => {
    expect(shouldSkipPassiveEvent("business_lead", "localhost", "HeadlessChrome")).toBe(false);
  });
});

describe("passive tracking early exit", () => {
  beforeEach(() => vi.clearAllMocks());
  it("does not request authentication for a suppressed preview pageview", async () => {
    await trackLead({ formType: "pageview" });
    expect(getUser).not.toHaveBeenCalled();
  });
});
