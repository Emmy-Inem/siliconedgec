import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Content = Tables<"site_content">;

const columns: Column<Content>[] = [
  { key: "key", label: "Key", render: (c) => <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{c.key}</span> },
  { key: "value", label: "Value", render: (c) => <span className="line-clamp-2 max-w-md">{c.value || "—"}</span> },
  { key: "content_type", label: "Type" },
  { key: "updated_at", label: "Updated", render: (c) => new Date(c.updated_at).toLocaleDateString() },
];

const emptyForm = { key: "", value: "", content_type: "text" };

export default function AdminSiteContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-site-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("*").order("key");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("site_content").update({ value: form.value, content_type: form.content_type }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_content").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-site-content"] }); setDialogOpen(false); setEditing(null); setForm(emptyForm); toast({ title: editing ? "Updated" : "Created" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("site_content").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-site-content"] }); toast({ title: "Deleted" }); },
  });

  return (
    <>
      <AdminCrudTable title="Site Content" data={data} columns={columns} isLoading={isLoading} addLabel="Add Content"
        onAdd={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}
        onEdit={(c) => { setEditing(c); setForm({ key: c.key, value: c.value ?? "", content_type: c.content_type ?? "text" }); setDialogOpen(true); }}
        onDelete={(id) => del.mutate(id)}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Content" : "Add Content"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Key</label>
              <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required disabled={!!editing} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50" />
              {!editing && <p className="text-xs text-muted-foreground mt-1">e.g. hero_title, hero_subtitle, cta_text</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Content Type</label>
              <select value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                <option value="text">Text</option>
                <option value="html">HTML</option>
                <option value="url">URL</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Value</label>
              <textarea value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} rows={6} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
