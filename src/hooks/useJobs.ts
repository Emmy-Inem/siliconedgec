import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  description: string;
  requirements: string | null;
  benefits: string | null;
  application_url: string | null;
  contact_email: string | null;
  is_remote: boolean;
  is_published: boolean;
  expires_at: string | null;
  applications_count: number;
  views_count: number;
  created_at: string;
}

export function useJobs(filters?: { type?: string; remote?: boolean; search?: string }) {
  return useQuery({
    queryKey: ["jobs", filters],
    queryFn: async () => {
      let q = supabase.from("jobs").select("*").eq("is_published", true).order("created_at", { ascending: false });
      if (filters?.type && filters.type !== "all") q = q.eq("job_type", filters.type);
      if (filters?.remote) q = q.eq("is_remote", true);
      const { data, error } = await q;
      if (error) throw error;
      let list = (data || []) as Job[];
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        list = list.filter(j => j.title.toLowerCase().includes(s) || j.company.toLowerCase().includes(s) || (j.location || "").toLowerCase().includes(s));
      }
      return list;
    },
  });
}

export function useJob(id?: string) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Job | null;
    },
    enabled: !!id,
  });
}
