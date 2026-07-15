import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Source-of-truth statuses that indicate a user paid or was granted access.
// Keep in sync with the DB function public.user_can_access_course.
const PAID = ["paid", "success", "completed", "confirmed", "granted"];
const GRANTED_SOURCES = ["manual_grant", "promo", "bootcamp"];

/**
 * Returns whether the current user can access protected course materials
 * (lessons, quizzes, assignments).
 *
 * Delegates to the DB RPC `user_can_access_course` (via `is_paid_enrolled`)
 * so this stays in lockstep with server-side RLS. Access is granted when:
 *  - the user has an admin/moderator/instructor role, OR
 *  - the course is cohort_only AND the user is a cohort member, OR
 *  - the user has an enrollment with a paid/granted payment_status, OR
 *  - the user has an enrollment with access_source in manual_grant/promo/bootcamp.
 *
 * Webinar (payment_status='free') enrollments do NOT grant access.
 */
export function useCourseAccess(courseId?: string | null) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const isStaff = !!user && isAdmin;

  const { data, isLoading } = useQuery({
    queryKey: ["course-access", courseId, user?.id],
    queryFn: async () => {
      if (!user || !courseId) return null;
      // Single source of truth: DB RPC that combines every access path.
      const [rpc, { data: enrollment }, { data: course }, { data: cohorts }] =
        await Promise.all([
          supabase.rpc("is_paid_enrolled", { _course_id: courseId }),
          supabase
            .from("enrollments")
            .select("payment_status, access_source")
            .eq("course_id", courseId)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase.from("courses").select("cohort_only").eq("id", courseId).maybeSingle(),
          supabase.from("cohorts").select("id").eq("course_id", courseId),
        ]);
      const cohortIds = (cohorts ?? []).map((c: any) => c.id);
      let isCohortMember = false;
      if (cohortIds.length) {
        const { data: m } = await supabase
          .from("cohort_members")
          .select("id")
          .eq("user_id", user.id)
          .in("cohort_id", cohortIds)
          .limit(1)
          .maybeSingle();
        isCohortMember = !!m;
      }
      return {
        rpcAccess: rpc.data === true,
        enrollment,
        cohortOnly: !!(course as any)?.cohort_only,
        isCohortMember,
      };
    },
    enabled: !!user && !!courseId && !isStaff,
    // Never serve stale access — a newly-granted enrollment must be picked up
    // on the next page view without requiring a hard refresh/logout.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const enrollment = data?.enrollment ?? null;
  const status = String((enrollment as any)?.payment_status ?? "").toLowerCase();
  const source = String((enrollment as any)?.access_source ?? "").toLowerCase();
  const hasPaid =
    !!enrollment && (PAID.includes(status) || GRANTED_SOURCES.includes(source));
  const cohortOnly = !!data?.cohortOnly;
  const isCohortMember = !!data?.isCohortMember;
  const rpcAccess = !!data?.rpcAccess;

  // Prefer the DB RPC (server-authoritative). Fall back to the client-side
  // logic if the RPC returns null (network hiccup) so we don't regress.
  const canAccess = isStaff
    ? true
    : rpcAccess || (cohortOnly ? isCohortMember : hasPaid);

  if (import.meta.env.DEV && !!user && !!courseId && !isStaff && !canAccess && !isLoading) {
    // Diagnostic breadcrumbs so denial cases can be triaged without SQL.
    // eslint-disable-next-line no-console
    console.warn("[course-access] denied", {
      user_id: user.id,
      course_id: courseId,
      rpcAccess,
      enrollment_status: status || null,
      enrollment_source: source || null,
      cohortOnly,
      isCohortMember,
    });
  }

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