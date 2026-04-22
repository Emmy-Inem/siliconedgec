import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { Star } from "lucide-react";

interface Review {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name: string;
  course_title: string;
}

const columns: Column<Review>[] = [
  { key: "user_name", label: "User", render: (r) => r.user_name || <span className="font-mono text-xs text-muted-foreground">{r.user_id.slice(0, 8)}</span> },
  { key: "course_title", label: "Course", render: (r) => r.course_title || <span className="text-muted-foreground text-xs">Deleted course</span> },
  { key: "rating", label: "Rating", render: (r) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  )},
  { key: "comment", label: "Comment", render: (r) => (
    <span className="text-sm line-clamp-2 max-w-sm block">{r.comment || <em className="text-muted-foreground">No comment</em>}</span>
  )},
  { key: "created_at", label: "Date", render: (r) => new Date(r.created_at).toLocaleDateString() },
];

export default function AdminReviews() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const [reviewsRes, profilesRes, coursesRes] = await Promise.all([
        supabase.from("reviews").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name"),
        supabase.from("courses").select("id, title"),
      ]);
      if (reviewsRes.error) throw reviewsRes.error;
      const profileMap = new Map<string, string>();
      (profilesRes.data ?? []).forEach((p) => profileMap.set(p.user_id, p.full_name ?? ""));
      const courseMap = new Map<string, string>();
      (coursesRes.data ?? []).forEach((c) => courseMap.set(c.id, c.title));
      return (reviewsRes.data ?? []).map((r) => ({
        ...r,
        user_name: profileMap.get(r.user_id) ?? "",
        course_title: courseMap.get(r.course_id) ?? "",
      })) as Review[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
      await logAdminActivity("delete", "review", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast({ title: "Deleted" }); },
  });

  return (
    <AdminCrudTable
      title="Reviews"
      data={data}
      columns={columns}
      isLoading={isLoading}
      addLabel="(Submitted by users)"
      onAdd={() => toast({ title: "Info", description: "Reviews are submitted by enrolled students." })}
      onEdit={() => toast({ title: "Info", description: "Reviews can be deleted but not edited to preserve authenticity." })}
      onDelete={(id) => del.mutate(id)}
    />
  );
}
