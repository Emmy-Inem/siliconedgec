import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PAID = ["paid", "success", "completed", "confirmed"];

/**
 * Returns whether the current user can access protected course materials
 * (lessons, quizzes, assignments). Admin/moderator/instructor always pass.
 * Cohort-only courses additionally require cohort membership.
 * Webinar (free) and complimentary enrollments do NOT grant access.
 */
export function useCourseAccess(courseId?: string | null) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const isStaff = !!user && isAdmin;

  const { data, isLoading } = useQuery({
    queryKey: ["course-access", courseId, user?.id],
    queryFn: async () => {
      if (!user || !courseId) return null;
      const [{ data: enrollment }, { data: course }, { data: membership }] = await Promise.all([
        supabase
        .from("enrollments")
        .select("payment_status")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("courses").select("cohort_only").eq("id", courseId).maybeSingle(),
        supabase
          .from("cohort_members")
          .select("id, cohort:cohorts!inner(course_id)")
          .eq("user_id", user.id)
          .eq("cohort.course_id", courseId)
          .limit(1)
          .maybeSingle(),
      ]);
      return { enrollment, cohortOnly: !!(course as any)?.cohort_only, isCohortMember: !!membership };
    },
    enabled: !!user && !!courseId && !isStaff,
  });

  const enrollment = data?.enrollment ?? null;
  const hasPaid =
    !!enrollment && PAID.includes(String(enrollment.payment_status ?? "").toLowerCase());
  const cohortOnly = !!data?.cohortOnly;
  const isCohortMember = !!data?.isCohortMember;

  const canAccess = isStaff
    ? true
    : cohortOnly
      ? isCohortMember
      : hasPaid;

  return {
    loading: authLoading || (!!user && !!courseId && !isStaff && isLoading),
    canAccess,
    isStaff,
    isAuthed: !!user,
    enrollment,
    cohortOnly,
    isCohortMember,
  };
}