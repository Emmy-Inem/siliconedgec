import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformStats {
  coursesCount: number;
  learnersCount: number;
  certificatesCount: number;
}

export function usePlatformStatsQuery() {
  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: async (): Promise<PlatformStats> => {
      const [coursesRes, profilesRes, certsRes] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("certificates").select("id", { count: "exact", head: true }),
      ]);
      return {
        coursesCount: coursesRes.count ?? 0,
        learnersCount: profilesRes.count ?? 0,
        certificatesCount: certsRes.count ?? 0,
      };
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useInstructorsQuery() {
  return useQuery({
    queryKey: ["instructors-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instructors")
        .select("id, name, title, bio, avatar_url, rating, total_students")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useUserEnrollmentsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-enrollments", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          id,
          course_id,
          payment_status,
          progress_percentage,
          is_completed,
          created_at,
          course:courses (
            id,
            title,
            slug,
            thumbnail_url,
            category,
            difficulty,
            duration_hours
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 3,
  });
}
