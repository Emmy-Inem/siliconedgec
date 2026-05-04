import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch admin-overridable image URLs stored in `site_content` under the
 * `page_image_*` namespace. Returns a map of key → URL. Pages should call
 * this once and look up their image with a fallback to the bundled asset.
 */
export function usePageImages() {
  return useQuery({
    queryKey: ["page-images"],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data } = await supabase
        .from("site_content")
        .select("key, value")
        .like("key", "page_image_%");
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => {
        if (r.value && r.value.trim().length > 0) map[r.key] = r.value;
      });
      return map;
    },
  });
}

/** Convenience: returns either the admin-uploaded URL for `key` or `fallback`. */
export function usePageImage(key: string, fallback: string) {
  const { data = {} } = usePageImages();
  return data[key] || fallback;
}
