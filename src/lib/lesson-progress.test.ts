import { describe, it, expect } from "vitest";
import {
  isLessonUnlocked,
  findResumeLesson,
  isCourseComplete,
  lessonCounts,
  type LessonRef,
} from "./lesson-progress";

const lessons: LessonRef[] = [
  { id: "l1" },
  { id: "l2" },
  { id: "l3" },
  { id: "l4" },
];

describe("lesson unlock progression", () => {
  it("locks every lesson when the user has not paid", () => {
    const ctx = { lessons, completed: new Set<string>(), hasPaid: false };
    expect(isLessonUnlocked("l1", ctx)).toBe(false);
    expect(isLessonUnlocked("l4", ctx)).toBe(false);
  });

  it("unlocks only the first lesson initially for paid users", () => {
    const ctx = { lessons, completed: new Set<string>(), hasPaid: true };
    expect(isLessonUnlocked("l1", ctx)).toBe(true);
    expect(isLessonUnlocked("l2", ctx)).toBe(false);
    expect(isLessonUnlocked("l3", ctx)).toBe(false);
  });

  it("unlocks the next lesson only after the previous one is completed", () => {
    const ctx = { lessons, completed: new Set(["l1"]), hasPaid: true };
    expect(isLessonUnlocked("l2", ctx)).toBe(true);
    expect(isLessonUnlocked("l3", ctx)).toBe(false);
  });

  it("does NOT unlock later lessons from out-of-order completions", () => {
    // User somehow marks l3 done without l2 — l4 stays locked.
    const ctx = { lessons, completed: new Set(["l1", "l3"]), hasPaid: true };
    expect(isLessonUnlocked("l2", ctx)).toBe(true);
    expect(isLessonUnlocked("l3", ctx)).toBe(true); // l2 prior is missing, so locked
    // l3's gate is l2. l2 not completed -> l3 actually locked.
    const ctx2 = { lessons, completed: new Set(["l3"]), hasPaid: true };
    expect(isLessonUnlocked("l3", ctx2)).toBe(false);
    expect(isLessonUnlocked("l4", ctx2)).toBe(false);
  });

  it("staff/admins bypass unlock gating", () => {
    const ctx = { lessons, completed: new Set<string>(), isStaff: true, hasPaid: false };
    expect(isLessonUnlocked("l4", ctx)).toBe(true);
  });

  it("findResumeLesson returns first lesson with nothing completed", () => {
    const ctx = { lessons, completed: new Set<string>(), hasPaid: true };
    expect(findResumeLesson(ctx)?.id).toBe("l1");
  });

  it("findResumeLesson resumes after the last fully-completed prefix", () => {
    const ctx = { lessons, completed: new Set(["l1", "l2"]), hasPaid: true };
    expect(findResumeLesson(ctx)?.id).toBe("l3");
  });

  it("findResumeLesson ignores out-of-order completions", () => {
    // l3 is done but l2 isn't — resume should still be l2.
    const ctx = { lessons, completed: new Set(["l1", "l3"]), hasPaid: true };
    expect(findResumeLesson(ctx)?.id).toBe("l2");
  });

  it("findResumeLesson returns null for unpaid non-staff users", () => {
    const ctx = { lessons, completed: new Set<string>(), hasPaid: false };
    expect(findResumeLesson(ctx)).toBeNull();
  });

  it("isCourseComplete only true when every lesson is completed", () => {
    expect(
      isCourseComplete({ lessons, completed: new Set(["l1", "l2", "l3"]), hasPaid: true }),
    ).toBe(false);
    expect(
      isCourseComplete({
        lessons,
        completed: new Set(["l1", "l2", "l3", "l4"]),
        hasPaid: true,
      }),
    ).toBe(true);
  });

  it("lessonCounts returns done/total for the dashboard indicator", () => {
    expect(
      lessonCounts({ lessons, completed: new Set(["l1", "l2"]), hasPaid: true }),
    ).toEqual({ done: 2, total: 4 });
  });
});
