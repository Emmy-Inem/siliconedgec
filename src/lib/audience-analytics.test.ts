import { beforeEach, describe, expect, it } from "vitest";
import { analyticsPreset, analyticsRange, analyticsVisitorId } from "./audience-analytics";

describe("analytics reporting periods", () => {
  it("includes both selected dates and excludes the next day", () => {
    expect(analyticsRange("2026-10-01", "2026-10-07")).toMatchObject({ p_from: new Date("2026-10-01T00:00:00").toISOString(), p_to: new Date("2026-10-08T00:00:00").toISOString() });
  });
  it("selects exactly seven calendar days", () => {
    expect(analyticsPreset(7, new Date(2026, 9, 27, 6, 50))).toEqual({ from: "2026-10-21", to: "2026-10-27" });
  });
  it("rejects backwards and missing dates", () => {
    expect(analyticsRange("2026-10-27", "2026-10-20")).toBeNull();
    expect(analyticsRange("", "")).toBeNull();
  });
});
describe("anonymous visitors", () => {
  beforeEach(() => localStorage.clear());
  it("counts repeat browser visits under the same identity", () => {
    const first = analyticsVisitorId();
    expect(first.length).toBeGreaterThan(0);
    expect(analyticsVisitorId()).toBe(first);
    localStorage.clear();
    expect(analyticsVisitorId()).not.toBe(first);
  });
});