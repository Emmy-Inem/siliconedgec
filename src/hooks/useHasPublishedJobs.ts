import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHasPublishedJobs() {
  return useQuery({
    queryKey: ["jobs", "has-published"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true);
      if (error) return false;
      return (count ?? 0) > 0;
    },
    staleTime: 5 * 60 * 1000,
  });
}