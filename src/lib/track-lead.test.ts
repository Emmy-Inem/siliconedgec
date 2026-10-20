import { describe, it, expect } from "vitest";
import { shouldSkipPassiveEvent } from "./track-lead";

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
});
