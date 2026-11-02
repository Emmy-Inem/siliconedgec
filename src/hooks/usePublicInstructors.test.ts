import { describe, expect, it } from "vitest";
import { visibleStudentCount } from "./usePublicInstructors";

describe("instructor student totals", () => {
  it("hides zero students", () => {
    expect(visibleStudentCount(0)).toBeNull();
  });
  it("shows the count once an instructor has students", () => {
    expect(visibleStudentCount(5)).toBe(5);
  });
});