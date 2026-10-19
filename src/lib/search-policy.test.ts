import { describe, expect, it, vi } from "vitest";
import { analyticsPagePath, canonicalPageUrl, isPrivateSearchPage } from "./search-policy";
import { gaPageview } from "./analytics";

describe("search visibility", () => {
  it("excludes admin pages and nested admin pages", () => {
    expect(isPrivateSearchPage("/admin")).toBe(true);
    expect(isPrivateSearchPage("/admin/people")).toBe(true);
  });
  it("keeps public courses, cities, blogs and help discoverable", () => {
    for (const path of ["/", "/courses/azure", "/locations/london", "/blog/ai", "/help/payment", "/verify"]) {
      expect(isPrivateSearchPage(path)).toBe(false);
    }
  });
  it("excludes private learner and transactional pages", () => {
    for (const path of ["/account", "/orders/123", "/courses/azure/learn", "/career/dashboard", "/cohorts/123", "/bootcamp", "/verify/123"]) {
      expect(isPrivateSearchPage(path)).toBe(true);
    }
  });
  it("uses the production domain without query duplicates", () => {
    expect(canonicalPageUrl("/courses", "https://siliconedgec.lovable.app/courses?category=Cloud&utm_source=google")).toBe("https://siliconedgec.com/courses");
  });
  it("does not send personal callback parameters to Google", () => {
    expect(analyticsPagePath("/sign-in", "?email=private@example.com&token=secret&reference=pay&utm_source=google")).toBe("/sign-in?utm_source=google");
  });
  it("sends one Google pageview, not two", () => {
    const send = vi.fn();
    window.gtag = send;
    gaPageview("/courses");
    expect(send.mock.calls.filter((call) => call[1] === "page_view")).toHaveLength(1);
    delete window.gtag;
  });
});