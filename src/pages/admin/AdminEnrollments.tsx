import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";

interface EnrollmentRow {
  id: string;
  user_id: string;
  course_id: string;
  payment_status: string | null;
  progress_percentage: number | null;
  is_completed: boolean | null;
  created_at: string;
  updated_at: string;
  user_name: string;
  course_title: string;
}

const columns: Column<EnrollmentRow>[] = [
  { key: "user_name", label: "User", render: (e) => e.user_name || <span className="font-mono text-xs text-muted-foreground">{e.user_id.slice(0, 8)}...</span> },
  { key: "course_title", label: "Course", render: (e) => e.course_title || <span className="font-mono text-xs text-muted-foreground">{e.course_id.slice(0, 8)}...</span> },
  { key: "payment_status", label: "Payment", render: (e) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      e.payment_status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
      e.payment_status === "refunded" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    }`}>{e.payment_status}</span>
  )},
  { key: "progress_percentage", label: "Progress", render: (e) => (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${e.progress_percentage ?? 0}%` }} />
      </div>
      <span className="text-xs">{e.progress_percentage ?? 0}%</span>
    </div>
  )},
  { key: "is_completed", label: "Completed", render: (e) => e.is_completed ? "✅" : "—" },
  { key: "created_at", label: "Date", render: (e) => new Date(e.created_at).toLocaleDateString() },
];

export default function AdminEnrollments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EnrollmentRow | null>(null);
  const [form, setForm] = useState({ payment_status: "pending", progress_percentage: 0, is_completed: false });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const [enrollmentsRes, profilesRes, coursesRes] = await Promise.all([
        supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name"),
        supabase.from("courses").select("id, title"),
      ]);
      if (enrollmentsRes.error) throw enrollmentsRes.error;

      const profileMap = new Map<string, string>();
      (profilesRes.data ?? []).forEach((p) => profileMap.set(p.user_id, p.full_name ?? ""));
      const courseMap = new Map<string, string>();
      (coursesRes.data ?? []).forEach((c) => courseMap.set(c.id, c.title));

      return (enrollmentsRes.data ?? []).map((e) => ({
        ...e,
        user_name: profileMap.get(e.user_id) ?? "",
        course_title: courseMap.get(e.course_id) ?? "",
      })) as EnrollmentRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("enrollments").update(form).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
      setDialogOpen(false);
      toast({ title: "Updated" });
      if (editing) logAdminActivity("update", "enrollment", editing.id, { payment_status: form.payment_status });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("enrollments").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-enrollments"] }); toast({ title: "Deleted" }); },
  });

  return (
    <>
      <AdminCrudTable title="Enrollments" data={data} columns={columns} isLoading={isLoading} addLabel="(Via enrollment flow)"
        onAdd={() => toast({ title: "Info", description: "Enrollments are created when users enroll in courses." })}
        onEdit={(e) => { setEditing(e); setForm({ payment_status: e.payment_status ?? "pending", progress_percentage: Number(e.progress_percentage ?? 0), is_completed: e.is_completed ?? false }); setDialogOpen(true); }}
        onDelete={(id) => del.mutate(id)}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Enrollment</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Payment Status</label>
              <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Progress (%)</label>
              <input type="number" min="0" max="100" value={form.progress_percentage} onChange={(e) => setForm({ ...form, progress_percentage: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_completed} onChange={(e) => setForm({ ...form, is_completed: e.target.checked })} id="completed" className="rounded" />
              <label htmlFor="completed" className="text-sm">Completed</label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
