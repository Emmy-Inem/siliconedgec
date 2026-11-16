import { describe, expect, it, vi } from "vitest";
import { guardedChunkReload, isChunkLoadError } from "./lazy-with-retry";

describe("stale page-file recovery", () => {
  it("recognises the dynamic import failure", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: /assets/CourseDetail-Bs49mNSc.js"))).toBe(true);
    expect(isChunkLoadError(new Error("Something else"))).toBe(false);
  });
  it("reloads only once within a minute to avoid loops", () => {
    sessionStorage.clear();
    const reload = vi.fn();
    expect(guardedChunkReload(sessionStorage, reload)).toBe(true);
    expect(guardedChunkReload(sessionStorage, reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
