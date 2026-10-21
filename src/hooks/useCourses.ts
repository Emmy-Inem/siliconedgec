import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { courses as staticCourses, type Course as StaticCourse } from "@/data/courses";

export interface DbLesson {
  id: string;
  title: string;
  duration: string | null;
  order_index: number;
}

export interface DbModule {
  id: string;
  title: string;
  order_index: number;
  lessons: DbLesson[];
}

export interface DbCourse {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  long_description?: string | null;
  category: string;
  price: number;
  difficulty: string;
  duration_hours: number;
  thumbnail_url: string | null;
  rating: number | null;
  students_enrolled: number | null;
  learning_outcomes: string[] | null;
  whats_included: string[] | null;
  is_published: boolean | null;
  who_is_this_for?: string[];
  prerequisites?: string | null;
  requirements?: string[];
  instructor: {
    id: string;
    name: string;
    bio: string | null;
    avatar_url: string | null;
  } | null;
  modules: DbModule[];
}

function mapStaticCourseToDbCourse(c: StaticCourse): DbCourse {
  const slug = c.slug || c.id;
  return {
    id: c.id,
    slug,
    title: c.title,
    description: c.description,
    category: c.category,
    price: c.price,
    difficulty: c.difficulty,
    duration_hours: c.durationHours,
    thumbnail_url: c.thumbnailUrl || null,
    rating: c.rating,
    students_enrolled: c.studentsEnrolled,
    learning_outcomes: c.learningOutcomes,
    whats_included: c.whatsIncluded ?? [
      "24 hours of interactive lessons, practical walkthroughs, and case studies",
      "Prompt Engineering Cheat Sheet + 50+ Copy-Paste Workplace Prompt Templates",
      "Weekly hands-on labs and capstone project review",
      "Silicon Edge Consulting Certificate of Completion",
    ],
    is_published: c.isPublished !== false,
    instructor: c.instructorName ? {
      id: "inst-" + c.id,
      name: c.instructorName,
      bio: c.instructorBio,
      avatar_url: c.instructorAvatar || null,
    } : null,
    modules: c.modules.map((m, mIdx) => ({
      id: m.id,
      title: m.title,
      order_index: mIdx,
      lessons: m.lessons.map((l, lIdx) => ({
        id: l.id,
        title: l.title,
        duration: l.duration,
        order_index: lIdx,
      })),
    })),
  };
}

// Webinars (free / titles starting with "FREE") sort first, then newest.
export function isWebinarCourse(c: Pick<DbCourse, "price" | "title">): boolean {
  return (c.price ?? 0) === 0 || (c.title ?? "").toUpperCase().startsWith("FREE");
}

// Always-pin slugs at the absolute top of every public listing (home, /courses).
const PINNED_SLUGS = new Set<string>([
  "cloud-engineering-accelerator-4-week-hands-on-bootcamp",
]);

function sortWebinarsFirst(list: DbCourse[]): DbCourse[] {
  return [...list].sort((a, b) => {
    const ap = a.slug && PINNED_SLUGS.has(a.slug) ? 1 : 0;
    const bp = b.slug && PINNED_SLUGS.has(b.slug) ? 1 : 0;
    if (ap !== bp) return bp - ap; // pinned first
    const aw = isWebinarCourse(a) ? 1 : 0;
    const bw = isWebinarCourse(b) ? 1 : 0;
    if (aw !== bw) return bw - aw; // webinars first
    return 0; // preserve existing created_at desc order
  });
}

// Lightweight fetch for listing pages — no modules/lessons
async function fetchCourses(): Promise<DbCourse[]> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*, instructor:instructors(id, name, bio, avatar_url)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("fetchCourses DB query failed, falling back to static courses:", error);
  }

  const existingKeys = new Set<string>();
  const mapped = (courses ?? []).map((c: any) => {
    if (c.slug) existingKeys.add(c.slug.toLowerCase());
    if (c.id) existingKeys.add(c.id.toLowerCase());
    return {
      ...c,
      instructor: Array.isArray(c.instructor) ? c.instructor[0] ?? null : c.instructor,
      modules: [],
    };
  });

  // Seamlessly merge published static courses that aren't yet in the database
  const extraCourses = staticCourses
    .filter(
      (sc) =>
        sc.isPublished !== false &&
        !existingKeys.has((sc.slug || sc.id).toLowerCase()) &&
        !existingKeys.has(sc.id.toLowerCase())
    )
    .map(mapStaticCourseToDbCourse);

  return sortWebinarsFirst([...mapped, ...extraCourses]);
}

// Full fetch with modules/lessons for detail page
async function fetchCourseByIdOrSlug(idOrSlug: string): Promise<DbCourse | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const column = isUuid ? "id" : "slug";
  const { data: course, error } = await supabase
    .from("courses")
    .select("*, instructor:instructors(id, name, bio, avatar_url)")
    .eq(column, idOrSlug)
    .maybeSingle();

  if (error) {
    console.warn("fetchCourseByIdOrSlug DB query error:", error);
  }

  const staticMatch = staticCourses.find(
    (c) =>
      c.id.toLowerCase() === idOrSlug.toLowerCase() ||
      (c.slug && c.slug.toLowerCase() === idOrSlug.toLowerCase()) ||
      c.id.toLowerCase() === ((course as any)?.id || "").toLowerCase() ||
      (c.slug && c.slug.toLowerCase() === ((course as any)?.slug || "").toLowerCase()) ||
      c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === idOrSlug.toLowerCase() ||
      (course && c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === ((course as any)?.slug || "").toLowerCase())
  );

  if (!course) {
    if (staticMatch) {
      return mapStaticCourseToDbCourse(staticMatch);
    }
    return null;
  }

  const { data: dbModules } = await supabase
    .from("modules")
    .select("*, lessons:lessons(id, title, duration, order_index)")
    .eq("course_id", (course as any).id)
    .order("order_index");

  let resolvedModules: DbModule[] = (dbModules ?? [])
    .map((m: any) => ({
      id: m.id,
      title: m.title,
      order_index: m.order_index,
      lessons: (m.lessons ?? []).sort((a: DbLesson, b: DbLesson) => a.order_index - b.order_index),
    }))
    .sort((a, b) => a.order_index - b.order_index);

  // Fallback to static modules if database has no modules yet
  if (resolvedModules.length === 0 && staticMatch?.modules?.length) {
    resolvedModules = staticMatch.modules.map((m, mIdx) => ({
      id: m.id,
      title: m.title,
      order_index: mIdx,
      lessons: m.lessons.map((l, lIdx) => ({
        id: l.id,
        title: l.title,
        duration: l.duration,
        order_index: lIdx,
      })),
    }));

    // Asynchronously seed modules & lessons into DB if course exists with a valid UUID
    const isDbUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((course as any).id);
    if (isDbUuid) {
      (async () => {
        try {
          for (let mIdx = 0; mIdx < staticMatch.modules.length; mIdx++) {
            const sm = staticMatch.modules[mIdx];
            const { data: modRow } = await supabase
              .from("modules")
              .insert({
                course_id: (course as any).id,
                title: sm.title,
                order_index: mIdx,
              })
              .select("id")
              .single();

            if (modRow && sm.lessons?.length) {
              await supabase.from("lessons").insert(
                sm.lessons.map((sl, lIdx) => ({
                  module_id: modRow.id,
                  title: sl.title,
                  duration: sl.duration,
                  order_index: lIdx,
                }))
              );
            }
          }
        } catch (seedErr) {
          console.warn("Async modules seed error:", seedErr);
        }
      })();
    }
  }

  // Merge missing metadata with rich static defaults
  const learningOutcomes =
    course.learning_outcomes && (course.learning_outcomes as string[]).length > 0
      ? course.learning_outcomes
      : staticMatch?.learningOutcomes ?? [];

  const whatsIncluded =
    course.whats_included && (course.whats_included as string[]).length > 0
      ? course.whats_included
      : staticMatch?.whatsIncluded ?? [
          "24 hours of interactive lessons, practical walkthroughs, and case studies",
          "Prompt Engineering Cheat Sheet + 50+ Copy-Paste Workplace Prompt Templates",
          "Weekly hands-on labs: Document synthesis, Excel automation, and custom GPT creation",
          "Verified Certificate of Completion from Silicon Edge Consulting",
        ];

  const description =
    course.description && course.description.trim().length > 0
      ? course.description
      : staticMatch?.longDescription || staticMatch?.description || "";

  return {
    ...course,
    description,
    learning_outcomes: learningOutcomes,
    whats_included: whatsIncluded,
    who_is_this_for: (course as any).who_is_this_for ?? staticMatch?.whoIsThisFor ?? [],
    prerequisites: (course as any).prerequisites ?? staticMatch?.prerequisites ?? null,
    requirements: (course as any).requirements ?? staticMatch?.requirements ?? [],
    // Only the saved assignment can identify a person; content fallbacks must not invent one.
    instructor: Array.isArray(course.instructor)
      ? course.instructor[0] ?? null
      : course.instructor ?? null,
    modules: resolvedModules,
  };
}

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}

export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: ["course", id],
    queryFn: () => id ? fetchCourseByIdOrSlug(id) : Promise.resolve(null),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}
