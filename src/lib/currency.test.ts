import { describe, it, expect } from "vitest";
import { formatLocalized, detectVisitorCurrency, FALLBACK_RATES_FROM_NGN } from "@/lib/currency";
import { formatNaira } from "@/lib/format-currency";

describe("localized price display", () => {
  it("formats NGN amounts in the visitor's currency for US visitors", () => {
    const out = formatLocalized(500000, "USD", FALLBACK_RATES_FROM_NGN.USD, "en-US");
    expect(out).toContain("$");
    expect(out).not.toContain("₦");
    expect(out).toContain("335");
  });

  it("keeps Naira formatting for NGN", () => {
    expect(formatNaira(500000)).toBe("₦500,000");
  });

  it("shows Free for zero or invalid amounts", () => {
    expect(formatLocalized(0, "USD", FALLBACK_RATES_FROM_NGN.USD)).toBe("Free");
    expect(formatNaira(0)).toBe("Free");
  });

  it("detects currency from a cached geo country", () => {
    window.localStorage.setItem("sec_geo_country", "GB");
    expect(detectVisitorCurrency()).toBe("GBP");
    window.localStorage.removeItem("sec_geo_country");
  });
});
