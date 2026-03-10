import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Eye, Plus, Trash2 } from "lucide-react";

interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
}

interface PathCourse {
  id: string;
  path_id: string;
  course_id: string;
  order_index: number;
  courses?: { title: string } | null;
}

export default function AdminLearningPaths() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LearningPath | null>(null);
  const [form, setForm] = useState({ title: "", description: "", is_published: false });
  const [coursesDialogOpen, setCoursesDialogOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);

  const { data: paths = [], isLoading } = useQuery({
    queryKey: ["admin-learning-paths"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_paths").select("*").order("order_index");
      if (error) throw error;
      return data as LearningPath[];
    },
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ["admin-all-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: pathCourses = [] } = useQuery({
    queryKey: ["admin-path-courses", selectedPath?.id],
    queryFn: async () => {
      if (!selectedPath) return [];
      const { data, error } = await supabase
        .from("learning_path_courses")
        .select("*, courses(title)")
        .eq("path_id", selectedPath.id)
        .order("order_index");
      if (error) throw error;
      return data as PathCourse[];
    },
    enabled: !!selectedPath,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { title: form.title, description: form.description || null, is_published: form.is_published, order_index: editing?.order_index ?? paths.length };
      if (editing) {
        const { error } = await supabase.from("learning_paths").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("learning_paths").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-learning-paths"] }); setDialogOpen(false); toast({ title: editing ? "Path updated" : "Path created" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("learning_paths").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-learning-paths"] }); toast({ title: "Path deleted" }); },
  });

  const addCourseToPath = useMutation({
    mutationFn: async (courseId: string) => {
      if (!selectedPath) return;
      const { error } = await supabase.from("learning_path_courses").insert({ path_id: selectedPath.id, course_id: courseId, order_index: pathCourses.length });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-path-courses", selectedPath?.id] }); toast({ title: "Course added to path" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeCourseFromPath = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("learning_path_courses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-path-courses", selectedPath?.id] }); toast({ title: "Course removed" }); },
  });

  const columns: Column<LearningPath>[] = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description", render: (p) => <span className="truncate max-w-[200px] block">{p.description || "—"}</span> },
    { key: "is_published", label: "Status", render: (p) => <Badge variant={p.is_published ? "default" : "secondary"}>{p.is_published ? "Published" : "Draft"}</Badge> },
  ];

  const openAdd = () => { setEditing(null); setForm({ title: "", description: "", is_published: false }); setDialogOpen(true); };
  const openEdit = (p: LearningPath) => { setEditing(p); setForm({ title: p.title, description: p.description || "", is_published: p.is_published }); setDialogOpen(true); };
  const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  const assignedCourseIds = pathCourses.map((pc) => pc.course_id);
  const availableCourses = allCourses.filter((c) => !assignedCourseIds.includes(c.id));

  return (
    <>
      <AdminCrudTable
        title="Learning Paths"
        data={paths}
        columns={columns}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(id) => remove.mutate(id)}
        isLoading={isLoading}
        addLabel="Add Path"
        extraActions={(item) => (
          <button onClick={() => { setSelectedPath(item); setCoursesDialogOpen(true); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Path" : "Add Path"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_published" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
              <label htmlFor="is_published" className="text-sm font-medium">Published</label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={coursesDialogOpen} onOpenChange={setCoursesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Courses in "{selectedPath?.title}"</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {pathCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses assigned yet.</p>
            ) : (
              <ul className="space-y-1">
                {pathCourses.map((pc, i) => (
                  <li key={pc.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-muted/50">
                    <span>{i + 1}. {(pc.courses as any)?.title || pc.course_id}</span>
                    <button onClick={() => removeCourseFromPath.mutate(pc.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
            {availableCourses.length > 0 && (
              <div>
                <label className="text-sm font-medium block mb-1">Add Course</label>
                <select onChange={(e) => { if (e.target.value) addCourseToPath.mutate(e.target.value); e.target.value = ""; }} className={inputClass}>
                  <option value="">Select a course...</option>
                  {availableCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
