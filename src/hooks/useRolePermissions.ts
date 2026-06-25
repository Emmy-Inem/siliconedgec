import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setRolePermissionsMatrix, StaffRole } from "@/lib/admin-permissions";

/**
 * Loads the role_permissions matrix and stores it in the in-memory snapshot
 * consulted by canAccessRoute(). Returns the rows so admin UIs can render the
 * grid directly.
 */
export function useRolePermissions() {
  return useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("role_permissions")
        .select("role, route, allowed");
      if (error) throw error;
      const rows = (data ?? []) as { role: StaffRole; route: string; allowed: boolean }[];
      setRolePermissionsMatrix(rows);
      return rows;
    },
    staleTime: 1000 * 60 * 5,
  });
}