import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  title: string;
  description: string | null;
  category: string;
  price: number;
  difficulty: string;
  duration_hours: number;
  thumbnail_url: string | null;
  rating: number | null;
  students_enrolled: number | null;
  learning_outcomes: string[] | null;
  is_published: boolean | null;
  instructor: {
    id: string;
    name: string;
    bio: string | null;
    avatar_url: string | null;
  } | null;
  modules: DbModule[];
}

async function fetchCourses(): Promise<DbCourse[]> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*, instructor:instructors(id, name, bio, avatar_url)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!courses || courses.length === 0) return [];

  const courseIds = courses.map((c) => c.id);

  const { data: modules } = await supabase
    .from("modules")
    .select("*, lessons:lessons(id, title, duration, order_index)")
    .in("course_id", courseIds)
    .order("order_index");

  const modulesByCourse: Record<string, DbModule[]> = {};
  (modules ?? []).forEach((m: any) => {
    const cid = m.course_id;
    if (!modulesByCourse[cid]) modulesByCourse[cid] = [];
    modulesByCourse[cid].push({
      id: m.id,
      title: m.title,
      order_index: m.order_index,
      lessons: (m.lessons ?? []).sort((a: DbLesson, b: DbLesson) => a.order_index - b.order_index),
    });
  });

  return courses.map((c: any) => ({
    ...c,
    instructor: Array.isArray(c.instructor) ? c.instructor[0] ?? null : c.instructor,
    modules: (modulesByCourse[c.id] ?? []).sort((a, b) => a.order_index - b.order_index),
  }));
}

async function fetchCourseById(id: string): Promise<DbCourse | null> {
  const { data: course, error } = await supabase
    .from("courses")
    .select("*, instructor:instructors(id, name, bio, avatar_url)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!course) return null;

  const { data: modules } = await supabase
    .from("modules")
    .select("*, lessons:lessons(id, title, duration, order_index)")
    .eq("course_id", id)
    .order("order_index");

  return {
    ...course,
    instructor: Array.isArray(course.instructor) ? course.instructor[0] ?? null : course.instructor,
    modules: (modules ?? []).map((m: any) => ({
      id: m.id,
      title: m.title,
      order_index: m.order_index,
      lessons: (m.lessons ?? []).sort((a: DbLesson, b: DbLesson) => a.order_index - b.order_index),
    })).sort((a, b) => a.order_index - b.order_index),
  };
}

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  });
}

export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: ["course", id],
    queryFn: () => fetchCourseById(id!),
    enabled: !!id,
  });
}
