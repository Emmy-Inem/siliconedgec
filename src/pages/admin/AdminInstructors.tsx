import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Star, Upload, Loader2, X, User } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Instructor = Tables<"instructors">;

const columns: Column<Instructor>[] = [
  {
    key: "name",
    label: "Name",
    render: (i) => (
      <span className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {i.avatar_url ? (
            <img src={i.avatar_url} alt={i.name} className="w-full h-full object-cover" />
          ) : (
            <User className="h-4 w-4 text-primary" />
          )}
        </span>
        <span className="truncate">{i.name}</span>
      </span>
    ),
  },
  { key: "role", label: "Role" },
  { key: "rating", label: "Rating", render: (i) => (
    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent text-accent" />{i.rating}</span>
  )},
  { key: "students_count", label: "Students", render: (i) => (i.students_count ?? 0).toLocaleString() },
  { key: "courses_count", label: "Courses" },
];

const emptyForm = { name: "", role: "", bio: "", rating: 4.5, students_count: 0, courses_count: 0, avatar_url: "" };

export default function AdminInstructors() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `instructors/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("course-thumbnails").upload(fileName, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("course-thumbnails").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, avatar_url: data.publicUrl }));
      toast({ title: "Photo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-instructors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("instructors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("instructors").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("instructors").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-instructors"] }); setDialogOpen(false); setEditing(null); setForm(emptyForm); toast({ title: editing ? "Updated" : "Created" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("instructors").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-instructors"] }); toast({ title: "Deleted" }); },
  });

  return (
    <>
      <AdminCrudTable title="Instructors" data={data} columns={columns} isLoading={isLoading} addLabel="Add Instructor"
        onAdd={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}
        onEdit={(i) => { setEditing(i); setForm({ name: i.name, role: i.role ?? "", bio: i.bio ?? "", rating: Number(i.rating ?? 4.5), students_count: i.students_count ?? 0, courses_count: i.courses_count ?? 0, avatar_url: i.avatar_url ?? "" }); setDialogOpen(true); }}
        onDelete={(id) => del.mutate(id)}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Instructor" : "Add Instructor"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Profile Photo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-primary/60" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {uploading ? "Uploading..." : (form.avatar_url ? "Change Photo" : "Upload Photo")}
                  </Button>
                  {form.avatar_url && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, avatar_url: "" })} className="gap-1.5 text-destructive">
                      <X className="h-3.5 w-3.5" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div><label className="text-sm font-medium block mb-1">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div><label className="text-sm font-medium block mb-1">Role</label><input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div><label className="text-sm font-medium block mb-1">Bio</label><textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-sm font-medium block mb-1">Rating</label><input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1">Students</label><input type="number" value={form.students_count} onChange={(e) => setForm({ ...form, students_count: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1">Courses</label><input type="number" value={form.courses_count} onChange={(e) => setForm({ ...form, courses_count: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></div>
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
