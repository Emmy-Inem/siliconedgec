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
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  order_index: number;
  is_published: boolean;
  created_at: string;
}

const columns: Column<Brand>[] = [
  { key: "name", label: "Brand", render: (b) => (
    <div className="flex items-center gap-2">
      {b.logo_url ? <img src={b.logo_url} alt={b.name} className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-primary/10" />}
      <span className="font-medium">{b.name}</span>
    </div>
  )},
  { key: "slug", label: "Slug", render: (b) => <span className="font-mono text-xs">{b.slug}</span> },
  { key: "order_index", label: "Order" },
  { key: "is_published", label: "Status", render: (b) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${b.is_published ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
      {b.is_published ? "Published" : "Draft"}
    </span>
  )},
];

export default function AdminBrands() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", logo_url: "", website_url: "", description: "", order_index: 0, is_published: true });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("brands" as any).select("*").order("order_index"));
      if (error) throw error;
      return (data as unknown as Brand[]);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-") };
      if (editing) {
        const { error } = await (supabase.from("brands" as any).update(payload).eq("id", editing.id));
        if (error) throw error;
        await logAdminActivity("update", "brand", editing.id);
      } else {
        const { error } = await (supabase.from("brands" as any).insert(payload));
        if (error) throw error;
        await logAdminActivity("create", "brand");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-brands"] }); setOpen(false); toast({ title: editing ? "Updated" : "Created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("brands" as any).delete().eq("id", id));
      if (error) throw error;
      await logAdminActivity("delete", "brand", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-brands"] }); toast({ title: "Deleted" }); },
  });

  const reset = () => { setEditing(null); setForm({ name: "", slug: "", logo_url: "", website_url: "", description: "", order_index: 0, is_published: true }); };

  return (
    <>
      <AdminCrudTable
        title="Brands"
        data={data}
        columns={columns}
        isLoading={isLoading}
        onAdd={() => { reset(); setOpen(true); }}
        onEdit={(b) => { setEditing(b); setForm({ name: b.name, slug: b.slug, logo_url: b.logo_url ?? "", website_url: b.website_url ?? "", description: b.description ?? "", order_index: b.order_index, is_published: b.is_published }); setOpen(true); }}
        onDelete={(id) => del.mutate(id)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Brand</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
            <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
            <div><Label>Website URL</Label><Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Order</Label><Input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><Label>Published</Label></div>
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
