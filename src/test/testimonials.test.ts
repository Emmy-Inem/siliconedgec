import { describe, expect, it } from "vitest";
import {
  AUTHORITATIVE_STUDENT_TESTIMONIALS,
  LEGACY_STAGE_ZERO_QUOTE,
  normalizeTestimonials,
} from "@/lib/testimonials";

describe("normalizeTestimonials", () => {
  it("replaces boilerplate 'stage zero' quotes and duplicated roles with unique personal voices", () => {
    const dbRows = [
      {
        id: "a4516d96-9ad9-4bd7-8260-324e055a663f",
        name: "Linda Shenoy",
        role: "Developer and Bootcamp Instructor",
        quote: LEGACY_STAGE_ZERO_QUOTE,
        avatar_url: null,
        rating: 5,
      },
      {
        id: "c5369e2b-10d6-4171-ab51-0bb725c9a5f1",
        name: "Jean Adebayo",
        role: "Engineering Architect",
        quote: LEGACY_STAGE_ZERO_QUOTE,
        avatar_url: null,
        rating: 5,
      },
      {
        id: "5be72751-111b-4de3-bca0-0224fd6330ca",
        name: "Jekan Maurya",
        role: "Web Developer, UK",
        quote: LEGACY_STAGE_ZERO_QUOTE,
        avatar_url: null,
        rating: 5,
      },
      {
        id: "96f0e90b-f78e-4231-9a21-45c635b8db1a",
        name: "Rubik Nanda",
        role: "Web Developer, UK",
        quote: LEGACY_STAGE_ZERO_QUOTE,
        avatar_url: null,
        rating: 5,
      },
      {
        id: "71ec5f5f-830b-4a58-b067-735a2728e4a6",
        name: "Moses Kanjejo",
        role: "Web Developer, UK",
        quote: LEGACY_STAGE_ZERO_QUOTE,
        avatar_url: null,
        rating: 5,
      },
    ];

    const result = normalizeTestimonials(dbRows, true);

    expect(result).toHaveLength(AUTHORITATIVE_STUDENT_TESTIMONIALS.length);
    const uniqueQuotes = new Set(result.map((r) => r.quote));
    const uniqueRoles = new Set(result.map((r) => r.role));

    expect(uniqueQuotes.size).toBe(result.length);
    expect(uniqueRoles.size).toBe(result.length);
    expect(result.some((r) => r.quote.includes("stage zero"))).toBe(false);
    expect(result.some((r) => r.quote.includes("—"))).toBe(false);
    expect(result.some((r) => (r.role ?? "").includes("—"))).toBe(false);
  });

  it("preserves custom non-boilerplate reviews added by admins", () => {
    const customRow = [
      {
        id: "custom-id-1",
        name: "Custom Learner",
        role: "Senior SRE, Edinburgh",
        quote: "Custom review written by an admin for a specific cohort.",
        avatar_url: "https://example.com/avatar.jpg",
        rating: 5,
      },
    ];

    const result = normalizeTestimonials(customRow, false);
    expect(result[0].quote).toBe("Custom review written by an admin for a specific cohort.");
    expect(result[0].role).toBe("Senior SRE, Edinburgh");
  });
});
