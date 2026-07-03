import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

export interface InstructorCohort {
  id: string;
  name: string;
  course_id: string | null;
  course_title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string | null;
  member_count: number;
}

/**
 * Cohorts where the current user is a member with role='instructor',
 * or all cohorts if they're a global admin.
 */
export function useInstructorCohorts() {
  const { user, adminRole } = useAuth();
  return useQuery({
    queryKey: ["instructor-cohorts", user?.id, adminRole],
    enabled: !!user,
    queryFn: async (): Promise<InstructorCohort[]> => {
      // Admins see every cohort so they can preview the instructor experience.
      let cohortIds: string[] = [];
      if (adminRole === "admin") {
        const { data } = await db.from("cohorts").select("id");
        cohortIds = (data ?? []).map((r: any) => r.id);
      } else {
        const { data } = await db
          .from("cohort_members")
          .select("cohort_id")
          .eq("user_id", user!.id)
          .eq("role", "instructor");
        cohortIds = Array.from(new Set((data ?? []).map((r: any) => r.cohort_id)));
      }
      if (!cohortIds.length) return [];
      const { data: cohorts } = await db
        .from("cohorts")
        .select("id, name, course_id, starts_at, ends_at, status")
        .in("id", cohortIds)
        .order("starts_at", { ascending: false, nullsFirst: false });
      const courseIds = Array.from(
        new Set((cohorts ?? []).map((c: any) => c.course_id).filter(Boolean)),
      );
      const titles: Record<string, string> = {};
      if (courseIds.length) {
        const { data: cs } = await db.from("courses").select("id, title").in("id", courseIds);
        (cs ?? []).forEach((c: any) => (titles[c.id] = c.title));
      }
      // member counts
      const counts: Record<string, number> = {};
      const { data: memberRows } = await db
        .from("cohort_members")
        .select("cohort_id")
        .in("cohort_id", cohortIds);
      (memberRows ?? []).forEach((m: any) => {
        counts[m.cohort_id] = (counts[m.cohort_id] ?? 0) + 1;
      });
      return (cohorts ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        course_id: c.course_id,
        course_title: c.course_id ? titles[c.course_id] ?? null : null,
        starts_at: c.starts_at,
        ends_at: c.ends_at,
        status: c.status,
        member_count: counts[c.id] ?? 0,
      }));
    },
    staleTime: 1000 * 60 * 2,
  });
}

const STORAGE_KEY = "sec_instructor_active_cohort";

export function getActiveInstructorCohortId(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function setActiveInstructorCohortId(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("instructor-cohort-changed"));
  } catch {}
}

import { useEffect, useState } from "react";

export function useActiveInstructorCohort(cohorts: InstructorCohort[] | undefined) {
  const [id, setId] = useState<string | null>(getActiveInstructorCohortId());
  useEffect(() => {
    const handler = () => setId(getActiveInstructorCohortId());
    window.addEventListener("instructor-cohort-changed", handler);
    return () => window.removeEventListener("instructor-cohort-changed", handler);
  }, []);
  // Auto-select the first cohort if none picked.
  useEffect(() => {
    if (!id && cohorts && cohorts.length) {
      setActiveInstructorCohortId(cohorts[0].id);
    }
    if (id && cohorts && cohorts.length && !cohorts.some((c) => c.id === id)) {
      setActiveInstructorCohortId(cohorts[0]?.id ?? null);
    }
  }, [id, cohorts]);
  const active = cohorts?.find((c) => c.id === id) ?? cohorts?.[0] ?? null;
  return { activeId: active?.id ?? null, active, setActive: setActiveInstructorCohortId };
}