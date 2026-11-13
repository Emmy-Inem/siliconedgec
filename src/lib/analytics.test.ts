import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_ADS_EVENTS, googleAdsConversion, gaSetUserId, metaEvent } from "./analytics";

beforeEach(() => {
  localStorage.clear();
  delete window.__gadsLabelOverrides;
  window.gtag = vi.fn();
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => { delete window.gtag; delete window.fbq; delete window.__gadsLabelOverrides; vi.restoreAllMocks(); });

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