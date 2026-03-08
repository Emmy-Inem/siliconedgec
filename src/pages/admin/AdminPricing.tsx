import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Plan = Tables<"pricing_plans">;

const columns: Column<Plan>[] = [
  { key: "name", label: "Name" },
  { key: "price", label: "Price", render: (p) => p.price === 0 ? "Free" : `$${p.price}` },
  { key: "period", label: "Period" },
  { key: "highlight", label: "Featured", render: (p) => p.highlight ? "⭐ Yes" : "No" },
  { key: "order_index", label: "Order" },
];

const emptyForm = { name: "", price: 0, period: "/month", features: "" as string, highlight: false, order_index: 0 };

export default function AdminPricing() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_plans").select("*").order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, features: form.features.split("\n").filter(Boolean), price: Number(form.price) };
      if (editing) {
        const { error } = await supabase.from("pricing_plans").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pricing_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-pricing"] }); setDialogOpen(false); setEditing(null); setForm(emptyForm); toast({ title: editing ? "Updated" : "Created" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("pricing_plans").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-pricing"] }); toast({ title: "Deleted" }); },
  });

  return (
    <>
      <AdminCrudTable title="Pricing Plans" data={data} columns={columns} isLoading={isLoading} addLabel="Add Plan"
        onAdd={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}
        onEdit={(p) => { setEditing(p); setForm({ name: p.name, price: Number(p.price), period: p.period ?? "/month", features: (p.features ?? []).join("\n"), highlight: p.highlight ?? false, order_index: p.order_index ?? 0 }); setDialogOpen(true); }}
        onDelete={(id) => del.mutate(id)}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Plan" : "Add Plan"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div><label className="text-sm font-medium block mb-1">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">Price ($)</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1">Period</label><input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            </div>
            <div><label className="text-sm font-medium block mb-1">Features (one per line)</label><textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={5} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.highlight} onChange={(e) => setForm({ ...form, highlight: e.target.checked })} id="highlight" className="rounded" />
              <label htmlFor="highlight" className="text-sm">Featured / Most Popular</label>
            </div>
            <div><label className="text-sm font-medium block mb-1">Order</label><input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></div>
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
