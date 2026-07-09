import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";

interface AssignmentRow {
  id: string;
  title: string;
  lesson_id: string;
  instructions?: string | null;
  max_points: number | null;
  due_at: string | null;
  is_ai_generated: boolean | null;
  is_visible: boolean | null;
  created_at: string;
  lessons?: { title: string; modules?: { courses?: { title: string } } } | null;
}

/**
 * Admin/Instructor view over every assignment across the platform.
 * Purpose: give staff a single place to flip the publish switch on AI-drafted
 * or hand-authored assignments before students see them. Creation still
 * happens inside the course curriculum builder, so students never encounter
 * an assignment unless it lives on a real lesson.
 */
export default function AdminAssignments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentRow | null>(null);
  const [form, setForm] = useState({
    title: "",
    lesson_id: "",
    instructions: "",
    max_points: "100",
    due_at: "",
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["admin-all-lessons-for-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, modules(courses(title))")
        .order("title");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("assignments")
        .select("*, lessons(title, modules(courses(title)))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssignmentRow[];
    },
  });

  const toggleVisible = useMutation({
    mutationFn: async (a: AssignmentRow) => {
      const { error } = await (supabase as any)
        .from("assignments")
        .update({ is_visible: !a.is_visible })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: (_d, a) => {
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
      toast({ title: a.is_visible ? "Assignment hidden from students" : "Assignment published" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.lesson_id) {
        throw new Error("Title and lesson are required");
      }
      const payload = {
        title: form.title.trim(),
        lesson_id: form.lesson_id,
        instructions: form.instructions.trim() || null,
        max_points: Math.max(1, parseInt(form.max_points || "100", 10) || 100),
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      };
      if (editing) {
        const { error } = await (supabase as any)
          .from("assignments")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("assignments")
          .insert({ ...payload, is_ai_generated: false, is_visible: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
      qc.invalidateQueries({ queryKey: ["lesson-ai-exercises"] });
      setDialogOpen(false);
      toast({ title: editing ? "Assignment updated" : "Assignment created" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
      toast({ title: "Assignment deleted" });
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: "", lesson_id: "", instructions: "", max_points: "100", due_at: "" });
    setDialogOpen(true);
  };
  const openEdit = (a: AssignmentRow) => {
    setEditing(a);
    setForm({
      title: a.title,
      lesson_id: a.lesson_id,
      instructions: a.instructions ?? "",
      max_points: String(a.max_points ?? 100),
      due_at: a.due_at ? new Date(a.due_at).toISOString().slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const columns: Column<AssignmentRow>[] = [
    { key: "title", label: "Title" },
    {
      key: "lesson_id",
      label: "Course · Lesson",
      render: (a) => (
        <span className="text-xs text-muted-foreground">
          {(a.lessons as any)?.modules?.courses?.title
            ? `${(a.lessons as any).modules.courses.title} → `
            : ""}
          {(a.lessons as any)?.title ?? "—"}
        </span>
      ),
    },
    {
      key: "max_points",
      label: "Points",
      render: (a) => <Badge variant="secondary">{a.max_points ?? 100}</Badge>,
    },
    {
      key: "due_at",
      label: "Due",
      render: (a) => (
        <span className="text-xs">{a.due_at ? new Date(a.due_at).toLocaleDateString() : "—"}</span>
      ),
    },
    {
      key: "is_visible",
      label: "Status",
      render: (a) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={a.is_visible ? "default" : "outline"} className="text-[10px]">
            {a.is_visible ? "Published" : "Hidden"}
          </Badge>
          {a.is_ai_generated && (
            <Badge variant="secondary" className="text-[10px]">
              <Star className="h-2.5 w-2.5 mr-0.5" /> AI
            </Badge>
          )}
        </div>
      ),
    },
  ];

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <>
      <AdminCrudTable
        title="Assignments"
        data={rows}
        columns={columns}
        isLoading={isLoading}
        addLabel="Add Assignment"
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(id) => remove.mutate(id)}
        extraActions={(item) => (
          <button
            onClick={() => toggleVisible.mutate(item)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
            title={item.is_visible ? "Hide from students" : "Publish to students"}
          >
            {item.is_visible ? "Unpublish" : "Publish"}
          </button>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Assignment" : "Add Assignment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Lesson</label>
              <select
                value={form.lesson_id}
                onChange={(e) => setForm({ ...form, lesson_id: e.target.value })}
                className={inputClass}
                required
              >
                <option value="">Select lesson…</option>
                {lessons.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.modules?.courses?.title ? `${l.modules.courses.title} → ` : ""}
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Instructions</label>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                rows={5}
                className={inputClass}
                placeholder="What should the learner submit?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Max points</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_points}
                  onChange={(e) => setForm({ ...form, max_points: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Due (optional)</label>
                <input
                  type="datetime-local"
                  value={form.due_at}
                  onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : editing ? "Save changes" : "Create assignment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}