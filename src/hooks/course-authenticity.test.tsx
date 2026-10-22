import { createElement, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { courses } from "@/data/courses";
import { useCourse, useCourses } from "./useCourses";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

afterEach(cleanup);
const ai = courses[0];
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client }, children);
}

describe("course authenticity", () => {
  it("does not assign a fictional instructor to the static AI course", () => {
    expect(ai.instructorName).toBeNull();
    expect(ai.instructorBio).toBe("");
    expect(ai.instructorAvatar).toBe("");
  });

  it("does not invent AI learner totals or ratings", () => {
    expect(ai.rating).toBeNull();
    expect(ai.studentsEnrolled).toBeNull();
  });

  it("preserves an unassigned database instructor on the detail page", async () => {
    const saved = { id: ai.id, slug: ai.slug, instructor: null, description: "Saved description" };
    from.mockImplementation((table: string) => ({
      select: () => ({ eq: () => table === "courses"
        ? { maybeSingle: async () => ({ data: saved }) }
        : { order: async () => ({ data: [{ id: "module", title: "Saved module", order_index: 0, lessons: [] }] }) },
      }),
    }));
    const { result } = renderHook(() => useCourse(ai.slug), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instructor).toBeNull();
  });

  it("uses Sophie Bennett's saved assignment and portrait for the AI course", async () => {
    const instructor = {
      id: "2aeac898-8dc2-42e5-b64b-7430d73ce130",
      name: "Sophie Bennett",
      bio: "Saved instructor biography",
      avatar_url: "/saved-sophie-portrait.jpg",
    };
    const saved = { id: ai.id, slug: ai.slug, instructor, description: "Saved description" };
    from.mockImplementation((table: string) => ({
      select: () => ({ eq: () => table === "courses"
        ? { maybeSingle: async () => ({ data: saved }) }
        : { order: async () => ({ data: [{ id: "module", title: "Saved module", order_index: 0, lessons: [] }] }) },
      }),
    }));
    const { result } = renderHook(() => useCourse(ai.slug), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instructor).toEqual(instructor);
  });

  it("keeps fallback listings free of fictional instructors and statistics", async () => {
    from.mockImplementation(() => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [] }) }) }) }));
    const { result } = renderHook(() => useCourses(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const fallback = result.current.data?.find(c => c.id === ai.id);
    expect(fallback).toBeDefined();
    expect(fallback?.instructor).toBeNull();
    expect(fallback?.rating).toBeNull();
    expect(fallback?.students_enrolled).toBeNull();
  });
});