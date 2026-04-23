import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public Access Mode — admin-controlled toggle that lets visitors browse
 * normally-gated pages (Dashboard, Course Learning, etc.) without signing in.
 *
 * Stored as a single key in `site_content` so it's readable by anonymous
 * clients without extra schema work.
 *
 * Admin routes are NEVER affected — this only relaxes student-facing gates.
 */
export const PUBLIC_ACCESS_KEY = "public_access_mode";

export function usePublicAccessMode() {
  return useQuery({
    queryKey: ["public-access-mode"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", PUBLIC_ACCESS_KEY)
        .maybeSingle();
      return data?.value === "true";
    },
    staleTime: 60_000,
  });
}