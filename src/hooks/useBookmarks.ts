import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useBookmarks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("id, course_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const isBookmarked = (courseId: string) => bookmarks.some((b) => b.course_id === courseId);

  const toggle = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error("Not authenticated");
      const existing = bookmarks.find((b) => b.course_id === courseId);
      if (existing) {
        await supabase.from("bookmarks").delete().eq("id", existing.id);
        return { action: "removed" as const };
      } else {
        await supabase.from("bookmarks").insert({ user_id: user.id, course_id: courseId });
        return { action: "added" as const };
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["bookmarks", user?.id] });
      toast({ title: result.action === "added" ? "Bookmarked!" : "Bookmark removed" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { bookmarks, isLoading, isBookmarked, toggleBookmark: toggle.mutate, isToggling: toggle.isPending };
}
