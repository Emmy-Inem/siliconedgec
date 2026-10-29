import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function visibleStudentCount(count: number | null): number | null {
  return count != null && count > 0 ? count : null;
}

export function usePublicInstructors() {
  return useQuery({
    queryKey: ["public-instructors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instructors")
        .select("id,name,role,bio,avatar_url,students_count,courses(id,title,is_published)")
        .order("name");
      if (error) throw error;
      return (data ?? []).map(instructor => ({
        ...instructor,
        courses: instructor.courses.filter(course => course.is_published),
        students_count: visibleStudentCount(instructor.students_count),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}