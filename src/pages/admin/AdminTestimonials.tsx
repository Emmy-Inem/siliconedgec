import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Testimonial = Tables<"testimonials">;

const columns: Column<Testimonial>[] = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "quote", label: "Quote", render: (t) => <span className="line-clamp-2 max-w-xs">{t.quote}</span> },
  { key: "rating", label: "Rating" },
  { key: "order_index", label: "Order" },
];

const emptyForm = { name: "", role: "", quote: "", rating: 5, order_index: 0 };

export default function AdminTestimonials() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonials").select("*").order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("testimonials").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-testimonials"] }); setDialogOpen(false); setEditing(null); setForm(emptyForm); toast({ title: editing ? "Updated" : "Created" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("testimonials").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-testimonials"] }); toast({ title: "Deleted" }); },
  });

  return (
    <>
      <AdminCrudTable title="Testimonials" data={data} columns={columns} isLoading={isLoading} addLabel="Add Testimonial"
        onAdd={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}
        onEdit={(t) => { setEditing(t); setForm({ name: t.name, role: t.role ?? "", quote: t.quote, rating: t.rating ?? 5, order_index: t.order_index ?? 0 }); setDialogOpen(true); }}
        onDelete={(id) => del.mutate(id)}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div><label className="text-sm font-medium block mb-1">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div><label className="text-sm font-medium block mb-1">Role</label><input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div><label className="text-sm font-medium block mb-1">Quote</label><textarea value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} required rows={4} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">Rating (1-5)</label><input type="number" min="1" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1">Order</label><input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></div>
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
