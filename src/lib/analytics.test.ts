import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_ADS_EVENTS, googleAdsConversion, googleAdsCourseRegisterClick, gaSetUserId, metaEvent } from "./analytics";

beforeEach(() => {
  localStorage.clear();
  delete window.__gadsLabelOverrides;
  window.gtag = vi.fn();
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => { delete window.gtag; delete window.fbq; delete window.__gadsLabelOverrides; vi.restoreAllMocks(); });

describe("Course Register click conversion", () => {
  beforeEach(() => {
    localStorage.setItem("se_cookie_consent", "all");
    window.__seConsent = { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "granted", source: "user", updated_at: 123 };
    // Test fixture only; never installed as the production label.
    window.__gadsLabelOverrides = { CourseRegisterClick: "fixture_click_label" };
  });
  afterEach(() => { delete window.__seConsent; });
  it.each(["3b1f29ec-8fd4-4ff0-9357-1987b90e6c91", "a11b0001-1111-4000-8000-000000000001", "130b215d-8f37-41d4-8dc2-837a92e1b58c"])("sends one conversion with only course identity for %s", (id) => {
    localStorage.setItem("sec_utm_params", JSON.stringify({ utm_term: "private@example.com" }));
    expect(window.gtag).not.toHaveBeenCalled();
    googleAdsCourseRegisterClick(id);
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-18126380202/fixture_click_label", course_id: id, user_data: {}, transport_type: "beacon",
    });
  });
  it("never guesses a missing label or sends to the account alone", () => {
    delete window.__gadsLabelOverrides;
    googleAdsCourseRegisterClick("course-id");
    expect(window.gtag).not.toHaveBeenCalled();
  });
  it.each(["essential", "analytics", ""])("blocks without advertising acceptance: %s", (choice) => {
    localStorage.setItem("se_cookie_consent", choice);
    googleAdsCourseRegisterClick("course-id");
    expect(window.gtag).not.toHaveBeenCalled();
  });
  it("honours withdrawal", () => {
    if (window.__seConsent) window.__seConsent.ad_storage = "denied";
    googleAdsCourseRegisterClick("course-id");
    expect(window.gtag).not.toHaveBeenCalled();
  });
  it("queues one event without throwing when the tag is unavailable", () => {
    delete window.gtag;
    window.dataLayer = [];
    expect(() => googleAdsCourseRegisterClick("course-id")).not.toThrow();
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer?.[0][1]).toBe("conversion");
  });
});

it("sets GA identity without invalid Meta setters or duplicate pixel initialization", () => {
  window.fbq = vi.fn();
  gaSetUserId("test-user");
  expect(window.gtag).toHaveBeenCalledWith("set", { user_id: "test-user" });
  expect(window.fbq).not.toHaveBeenCalled();
  metaEvent("Lead", { form_type: "business_training" });
  expect(window.fbq).toHaveBeenCalledTimes(1);
  expect(window.fbq).toHaveBeenCalledWith("track", "Lead", { form_type: "business_training" }, { eventID: expect.any(String) });
});

describe("Google Ads enquiry conversion", () => {
  it("uses the verified Lead label and leaves all other default labels unchanged", () => {
    expect(GOOGLE_ADS_EVENTS.Lead.label).toBe("uD3NCJDwybcdEKq5qsND");
    for (const key of ["AddToCart", "InitiateCheckout", "CompleteRegistration", "Purchase", "WebinarRegistration"] as const) {
      expect(GOOGLE_ADS_EVENTS[key].label).toBeNull();
    }
    googleAdsConversion("Lead", { value: 0, currency: "GBP", form_type: "contact" });
    const calls = vi.mocked(window.gtag).mock.calls.filter(call => call[1] === "conversion");
    expect(calls).toHaveLength(1);
    expect(calls[0][2]).toEqual({ send_to: "AW-18126380202/uD3NCJDwybcdEKq5qsND", value: 0,
      currency: "GBP", form_type: "contact", transaction_id: expect.any(String) });
  });

  it("preserves label overrides and never changes consent during conversion reporting", () => {
    window.__gadsLabelOverrides = { Lead: "existing-override" };
    const consent = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
      analytics_storage: "granted", source: "stored", updated_at: 123 } as const;
    window.__seConsent = consent;
    googleAdsConversion("Lead", { value: 0, currency: "GBP", form_type: "business_training" });
    expect(window.gtag).toHaveBeenCalledWith("event", "conversion", expect.objectContaining({ send_to: "AW-18126380202/existing-override" }));
    expect(window.__seConsent).toBe(consent);
    expect(vi.mocked(window.gtag).mock.calls.some(call => call[0] === "consent")).toBe(false);
    delete window.__seConsent;
  });
});
describe("Lead label override safety", () => {
  it("an empty saved override keeps the default Lead label", async () => {
    const mod = await import("./analytics");
    (window as any).__gadsLabelOverrides = {};
    mod.applyGadsLabelOverrides({ Lead: "   " });
    const calls: unknown[][] = [];
    (window as any).gtag = (...a: unknown[]) => calls.push(a);
    mod.googleAdsConversion("Lead", { transaction_id: "t1" });
    const conv = calls.find((c) => c[1] === "conversion") as any[];
    expect(conv[2].send_to).toBe("AW-18126380202/uD3NCJDwybcdEKq5qsND");
  });
});
