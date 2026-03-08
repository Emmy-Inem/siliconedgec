import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

const columns: Column<Course>[] = [
  { key: "title", label: "Title" },
  { key: "category", label: "Category" },
  { key: "difficulty", label: "Level", render: (c) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      c.difficulty === "Beginner" ? "bg-green-100 text-green-700" :
      c.difficulty === "Intermediate" ? "bg-amber-100 text-amber-700" :
      "bg-red-100 text-red-700"
    }`}>{c.difficulty}</span>
  )},
  { key: "price", label: "Price", render: (c) => `$${c.price}` },
  { key: "is_published", label: "Status", render: (c) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
      {c.is_published ? "Published" : "Draft"}
    </span>
  )},
];

const emptyForm = {
  title: "",
  description: "",
  category: "Cloud Engineering",
  price: 0,
  difficulty: "Beginner" as string,
  duration_hours: 10,
  is_published: false,
  learning_outcomes: [] as string[],
  instructor_id: null as string | null,
};

export default function AdminCourses() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [outcomesText, setOutcomesText] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ["admin-instructors-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("instructors").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        learning_outcomes: outcomesText.split("\n").map((s) => s.trim()).filter(Boolean),
        instructor_id: form.instructor_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("courses").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setOutcomesText("");
      toast({ title: editing ? "Course updated" : "Course created" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Course deleted" });
    },
  });

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description ?? "",
      category: c.category,
      price: Number(c.price),
      difficulty: c.difficulty,
      duration_hours: Number(c.duration_hours),
      is_published: c.is_published ?? false,
      learning_outcomes: c.learning_outcomes ?? [],
      instructor_id: c.instructor_id ?? null,
    });
    setOutcomesText((c.learning_outcomes ?? []).join("\n"));
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOutcomesText("");
    setDialogOpen(true);
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <>
      <AdminCrudTable
        title="Courses"
        data={courses}
        columns={columns}
        isLoading={isLoading}
        addLabel="Add Course"
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(id) => del.mutate(id)}
        extraActions={(c) => (
          <Link to={`/admin/courses/${c.id}/modules`}>
            <Button size="sm" variant="outline" className="text-xs">Modules</Button>
          </Link>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Course" : "Add Course"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                  {["Cloud Engineering","DevOps","Cybersecurity","Programming & Software Development","Data Engineering","Artificial Intelligence & Machine Learning"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Difficulty</label>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className={inputClass}>
                  {["Beginner","Intermediate","Expert"].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Price ($)</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Duration (hours)</label>
                <input type="number" step="0.5" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Instructor</label>
              <select
                value={form.instructor_id ?? ""}
                onChange={(e) => setForm({ ...form, instructor_id: e.target.value || null })}
                className={inputClass}
              >
                <option value="">No instructor assigned</option>
                {instructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Learning Outcomes (one per line)</label>
              <textarea
                value={outcomesText}
                onChange={(e) => setOutcomesText(e.target.value)}
                rows={4}
                className={inputClass}
                placeholder="Master cloud architecture fundamentals&#10;Deploy production-grade infrastructure&#10;..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} id="published" className="rounded" />
              <label htmlFor="published" className="text-sm">Published</label>
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
