import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Copy, Trash2, Image as ImageIcon, FileText } from "lucide-react";
import { logAdminActivity } from "@/lib/admin-logger";
import { useAuth } from "@/contexts/AuthContext";

interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  alt_text: string | null;
  folder: string | null;
  created_at: string;
}

export default function AdminMedia() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ file_name: "", file_url: "", alt_text: "", folder: "general" });
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-media"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("media_library" as any).select("*").order("created_at", { ascending: false }));
      if (error) throw error;
      return (data as unknown as MediaItem[]);
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("media_library" as any).insert({ ...form, uploaded_by: user?.id }));
      if (error) throw error;
      await logAdminActivity("create", "media");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-media"] }); setOpen(false); toast({ title: "Added" }); setForm({ file_name: "", file_url: "", alt_text: "", folder: "general" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("media_library" as any).delete().eq("id", id));
      if (error) throw error;
      await logAdminActivity("delete", "media", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-media"] }); toast({ title: "Deleted" }); },
  });

  const copy = (url: string) => { navigator.clipboard.writeText(url); toast({ title: "Copied URL" }); };

  const filtered = data.filter((m) => m.file_name.toLowerCase().includes(search.toLowerCase()));
  const isImage = (t: string | null) => t?.startsWith("image") || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(t || "");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Media Library</h1>
          <p className="text-sm text-muted-foreground">Manage uploaded files & external image URLs.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Upload className="h-4 w-4" /> Add Media</Button>
      </div>

      <Input placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No media yet — add your first file.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="group relative bg-card border border-border rounded-xl overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {isImage(m.file_type) ? (
                  <img src={m.file_url} alt={m.alt_text ?? m.file_name} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                )}
              </div>
              <div className="p-2 space-y-1">
                <p className="text-xs font-medium truncate">{m.file_name}</p>
                <p className="text-[10px] text-muted-foreground">{m.folder}</p>
              </div>
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => copy(m.file_url)} className="p-1.5 bg-card/95 backdrop-blur rounded shadow"><Copy className="h-3 w-3" /></button>
                <button onClick={() => del.mutate(m.id)} className="p-1.5 bg-card/95 backdrop-blur rounded shadow text-destructive"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Media</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3">
            <div><Label>File Name *</Label><Input value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} required /></div>
            <div><Label>File URL *</Label><Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} required placeholder="https://..." /></div>
            <div><Label>Alt Text</Label><Input value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} /></div>
            <div><Label>Folder</Label><Input value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={add.isPending}>{add.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
