import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Review {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
}

export function useReviews(courseId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", courseId],
    queryFn: async () => {
      // Everyone reads the PII-free view; a signed-in user's own review is
      // fetched separately (RLS on `reviews` now scopes reads to own rows).
      const { data, error } = await supabase
        .from("reviews_public" as any)
        .select("*")
        .eq("course_id", courseId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for reviewers
      const userIds = [...new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean))];
      const profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.rpc("get_public_profiles", {
          p_user_ids: userIds as string[],
        });
        (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));
      }

      return (data ?? []).map((r: any) => ({
        ...r,
        profile: r.user_id ? profileMap.get(r.user_id) ?? null : null,
      })) as Review[];
    },
    enabled: !!courseId,
  });

  const { data: ownReview } = useQuery({
    queryKey: ["review-own", courseId, user?.id],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("course_id", courseId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data as any) ?? null;
    },
  });

  const submitReview = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("reviews").upsert(
        { user_id: user.id, course_id: courseId!, rating, comment, updated_at: new Date().toISOString() },
        { onConflict: "user_id,course_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews", courseId] });
      qc.invalidateQueries({ queryKey: ["review-own", courseId, user?.id] });
      toast({ title: "Review submitted!" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const userReview = (ownReview as Review | null) ?? undefined;
  const avgRating = reviews.length > 0 ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;

  return { reviews, isLoading, submitReview, userReview, avgRating, reviewCount: reviews.length };
}
