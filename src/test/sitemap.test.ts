import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { renderEntry, preservedEntries, cmsPath, fetchAll } = require("../../scripts/sitemap-utils.cjs");

describe("public sitemap", () => {
  it("omits lastmod without a page-specific date", () => {
    expect(renderEntry("/about")).not.toContain("lastmod");
    expect(renderEntry("/blog/ai", "2026-10-15T09:00:00Z")).toContain("<lastmod>2026-10-15</lastmod>");
  });
  it("preserves only the unavailable content source", () => {
    const xml = `${renderEntry("/paths/123")}${renderEntry("/blog/ai")}`;
    expect(preservedEntries(xml, "/paths")).toEqual([renderEntry("/paths/123").trim()]);
  });
  it("does not list redirected CMS aliases", () => {
    expect(cmsPath("about")).toBeNull();
    expect(cmsPath("training-guide")).toBe("/p/training-guide");
  });
  it("fetches public rows beyond the 1000-row limit", async () => {
    const calls: number[] = [];
    const rows = await fetchAll(() => ({ range: async (offset: number) => {
      calls.push(offset);
      return { data: Array.from({ length: offset === 0 ? 1000 : 2 }, (_, id) => ({ id: offset + id })), error: null };
    } }));
    expect(calls).toEqual([0, 1000]);
    expect(rows).toHaveLength(1002);
  });
});