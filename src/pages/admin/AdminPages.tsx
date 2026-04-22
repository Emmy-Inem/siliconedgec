import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  meta_description: string | null;
  status: string;
  show_in_footer: boolean;
  order_index: number;
  updated_at: string;
}

const columns: Column<Page>[] = [
  { key: "title", label: "Page", render: (p) => (
    <div>
      <span className="font-medium block">{p.title}</span>
      <span className="text-xs text-muted-foreground font-mono">/{p.slug}</span>
    </div>
  )},
  { key: "status", label: "Status", render: (p) => (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${p.status === "published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
  )},
  { key: "show_in_footer", label: "Footer", render: (p) => p.show_in_footer ? "✓" : "—" },
  { key: "updated_at", label: "Updated", render: (p) => new Date(p.updated_at).toLocaleDateString() },
];

export default function AdminPages() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", content: "", meta_description: "", status: "draft", show_in_footer: false, order_index: 0 });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-cms-pages"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("cms_pages" as any).select("*").order("order_index"));
      if (error) throw error;
      return (data as unknown) as Page[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const payload = { ...form, slug };
      if (editing) {
        const { error } = await (supabase.from("cms_pages" as any).update(payload).eq("id", editing.id));
        if (error) throw error;
        await logAdminActivity("update", "cms_page", editing.id);
      } else {
        const { error } = await (supabase.from("cms_pages" as any).insert(payload));
        if (error) throw error;
        await logAdminActivity("create", "cms_page");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-cms-pages"] }); setOpen(false); toast({ title: editing ? "Updated" : "Created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("cms_pages" as any).delete().eq("id", id));
      if (error) throw error;
      await logAdminActivity("delete", "cms_page", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-cms-pages"] }); toast({ title: "Deleted" }); },
  });

  const reset = () => { setEditing(null); setForm({ title: "", slug: "", content: "", meta_description: "", status: "draft", show_in_footer: false, order_index: 0 }); };

  return (
    <>
      <AdminCrudTable
        title="CMS Pages"
        data={data}
        columns={columns}
        isLoading={isLoading}
        addLabel="New Page"
        onAdd={() => { reset(); setOpen(true); }}
        onEdit={(p) => { setEditing(p); setForm({ title: p.title, slug: p.slug, content: p.content ?? "", meta_description: p.meta_description ?? "", status: p.status, show_in_footer: p.show_in_footer, order_index: p.order_index }); setOpen(true); }}
        onDelete={(id) => del.mutate(id)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Page</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
            <div><Label>Meta Description (SEO)</Label><Textarea rows={2} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} maxLength={160} /></div>
            <div><Label>Content (Markdown)</Label><Textarea rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="font-mono text-sm" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Order</Label><Input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-2"><Switch checked={form.show_in_footer} onCheckedChange={(v) => setForm({ ...form, show_in_footer: v })} /><Label>In Footer</Label></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
