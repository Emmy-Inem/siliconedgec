import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Sparkles, Loader2 } from "lucide-react";

interface Announcement {
  id: string;
  course_id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  courses?: { title: string } | null;
}

export default function AdminCourseAnnouncements() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: "", content: "", course_id: "" });
  const [aiPrompt, setAiPrompt] = useState("");
  const [drafting, setDrafting] = useState(false);

  const draftWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-draft-content", {
        body: { kind: "announcement", prompt: aiPrompt.trim() },
      });
      if (error) throw error;
      setForm((f) => ({ ...f, title: data?.title ?? f.title, content: data?.content ?? f.content }));
      toast({ title: "Draft ready" });
    } catch (e: any) {
      toast({ title: "Couldn't draft", description: e.message ?? "Try again", variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  };

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin-course-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("course_announcements").select("*, courses(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-all-courses-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { title: form.title, content: form.content, course_id: form.course_id, created_by: user!.id };
      if (editing) {
        const { error } = await supabase.from("course_announcements").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("course_announcements").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-course-announcements"] }); setDialogOpen(false); toast({ title: editing ? "Updated" : "Announcement created" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("course_announcements").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-course-announcements"] }); toast({ title: "Deleted" }); },
  });

  const columns: Column<Announcement>[] = [
    { key: "title", label: "Title" },
    { key: "course_id", label: "Course", render: (a) => <span className="text-xs">{(a.courses as any)?.title || "—"}</span> },
    { key: "created_at", label: "Date", render: (a) => format(new Date(a.created_at), "MMM d, yyyy") },
  ];

  const openAdd = () => { setEditing(null); setForm({ title: "", content: "", course_id: "" }); setDialogOpen(true); };
  const openEdit = (a: Announcement) => { setEditing(a); setForm({ title: a.title, content: a.content, course_id: a.course_id }); setDialogOpen(true); };
  const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div>
      <AdminCrudTable title="Course Announcements" data={announcements} columns={columns} onAdd={openAdd} onEdit={openEdit} onDelete={(id) => remove.mutate(id)} isLoading={isLoading} addLabel="New Announcement" />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <label className="text-xs font-medium flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Draft with AI</label>
              <div className="flex gap-2">
                <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g. Module 3 is now unlocked" className={inputClass} />
                <Button type="button" size="sm" variant="outline" onClick={draftWithAI} disabled={drafting || !aiPrompt.trim()}>
                  {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  <span className="ml-1">Draft</span>
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Course</label>
              <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} required className={inputClass}>
                <option value="">Select course...</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Content</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required className={inputClass} rows={4} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
