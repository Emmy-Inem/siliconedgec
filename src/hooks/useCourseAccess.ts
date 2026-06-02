import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PAID = ["paid", "success", "completed", "confirmed"];

/**
 * Returns whether the current user can access protected course materials
 * (lessons, quizzes, assignments). Admin/moderator always pass.
 * Webinar (free) and complimentary enrollments do NOT grant access.
 */
export function useCourseAccess(courseId?: string | null) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const isStaff = !!user && isAdmin;

  const { data: enrollment, isLoading } = useQuery({
    queryKey: ["course-access", courseId, user?.id],
    queryFn: async () => {
      if (!user || !courseId) return null;
      const { data } = await supabase
        .from("enrollments")
        .select("payment_status")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!courseId && !isStaff,
  });

  const hasPaid =
    !!enrollment && PAID.includes(String(enrollment.payment_status ?? "").toLowerCase());

  return {
    loading: authLoading || (!!user && !!courseId && !isStaff && isLoading),
    canAccess: isStaff || hasPaid,
    isStaff,
    isAuthed: !!user,
    enrollment,
  };
}