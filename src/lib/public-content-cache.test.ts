import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPublicContent, writePublicContent } from "./public-content-cache";
describe("public presentation cache", () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  it("reuses saved public content across reloads within the existing freshness window", () => {
    writePublicContent("home", { title: "Saved title" });
    expect(readPublicContent("home")?.data).toEqual({ title: "Saved title" });
  });
  it("expires at 30 minutes without extending freshness on reload", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    writePublicContent("home", { title: "Saved title" });
    vi.mocked(Date.now).mockReturnValue(now + 30 * 60_000);
    expect(readPublicContent("home")).toBeUndefined();
  });
  it("ignores corrupt cache entries", () => {
    localStorage.setItem("sec_public_v1_home", "invalid");
    expect(readPublicContent("home")).toBeUndefined();
  });
});