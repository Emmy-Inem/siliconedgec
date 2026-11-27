import { describe, it, expect } from "vitest";
import { getCompareAtPrice, getPercentOff } from "./course-pricing";
describe("course pricing", () => {
  it("shows saved original price and 80% off for 100,000 vs 500,000", () => {
    expect(getCompareAtPrice({ price: 100000, discount_price: 500000 })).toBe(500000);
    expect(getPercentOff({ price: 100000, discount_price: 500000 })).toBe(80);
  });
  it("shows no strikethrough without a higher saved original", () => {
    expect(getCompareAtPrice({ price: 100000, discount_price: null })).toBeNull();
    expect(getCompareAtPrice({ price: 100000, discount_price: 90000 })).toBeNull();
  });
});
