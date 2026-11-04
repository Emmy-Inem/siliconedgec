import { describe, expect, it } from "vitest";
import {
  DEFAULT_COURSE_DURATION_WEEKS,
  DEFAULT_COURSE_START_DATE,
  isDataEngineeringCourse,
  resolveCourseDurationWeeks,
  resolveCourseStartDate,
} from "@/hooks/useCourses";
import { courses as staticCourses } from "@/data/courses";

describe("course start dates, programme length, and pricing consistency", () => {
  it("sets 28th November 2026 as the start date for all courses except Data Engineering and 4 weeks programme length for all active courses", () => {
    expect(DEFAULT_COURSE_START_DATE).toBe("2026-11-28");
    expect(DEFAULT_COURSE_DURATION_WEEKS).toBe(4);
    expect(resolveCourseDurationWeeks({ duration_weeks: null })).toBe(4);
    expect(resolveCourseDurationWeeks({ duration_weeks: 0 })).toBe(4);

    expect(
      resolveCourseStartDate({
        id: "a11b0001-1111-4000-8000-000000000001",
        slug: "ai-beginners-llm-productivity",
        title: "Generative AI & Large Language Models",
        category: "Artificial Intelligence & Machine Learning",
        start_date: null,
      })
    ).toBe("2026-11-28");

    expect(
      resolveCourseStartDate({
        id: "817cb7e2-50cd-49b8-8d47-c23c139c4392",
        slug: "software-engineering-backend-dev",
        title: "Software Engineering & Backend Development",
        category: "Programming & Software Development",
        start_date: null,
      })
    ).toBe("2026-11-28");

    expect(
      resolveCourseStartDate({
        id: "3b1f29ec-8fd4-4ff0-9357-1987b90e6c91",
        slug: "cloud-engineering-accelerator-4-week-hands-on-bootcamp",
        title: "One-Month Cloud Engineering Bootcamp — Microsoft Azure",
        category: "Cloud Engineering",
        start_date: null,
      })
    ).toBe("2026-11-28");

    expect(
      resolveCourseStartDate({
        id: "130b215d-8f37-41d4-8dc2-837a92e1b58c",
        slug: "cybersecurity-fundamentals-network-security",
        title: "Cybersecurity Fundamentals & Network Security",
        category: "Cybersecurity",
        start_date: null,
      })
    ).toBe("2026-11-28");
  });

  it("keeps the Data Engineering course start date undecided (null) when not set", () => {
    const dataEngCourse = {
      id: "20360c5a-2279-4a64-a373-3514f81cb600",
      slug: "data-engineering-sql-etl-warehousing",
      title: "Data Engineering: SQL, ETL Basics & Data Warehousing",
      category: "Data Engineering",
      start_date: null,
    };

    expect(isDataEngineeringCourse(dataEngCourse)).toBe(true);
    expect(resolveCourseStartDate(dataEngCourse)).toBeNull();
  });

  it("uses 500,000 NGN selling price, 2026-11-28 start date, and 4 weeks duration on Generative AI static course without stale 75,000 discount_price", () => {
    const genAi = staticCourses.find((c) => c.slug === "ai-beginners-llm-productivity");
    expect(genAi).toBeDefined();
    expect(genAi?.price).toBe(500000);
    expect(genAi?.discountPrice).toBeUndefined();
    expect(genAi?.startDate).toBe("2026-11-28");
    expect(genAi?.durationWeeks).toBe(4);
  });
});
