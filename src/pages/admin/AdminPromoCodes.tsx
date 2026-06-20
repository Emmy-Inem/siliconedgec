import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { Badge } from "@/components/ui/badge";

interface PromoCode {
  id: string;
  code: string;
  influencer_name: string;
  influencer_email: string | null;
  discount_type: string;
  discount_value: number;
  commission_percentage: number;
  usage_count: number;
  max_uses: number | null;
  revenue_generated: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const blank = {
  code: "",
  influencer_name: "",
  influencer_email: "",
  discount_type: "percentage",
  discount_value: 10,
  commission_percentage: 0,
  max_uses: "" as string | number,
  is_active: true,
  expires_at: "",
};

const columns: Column<PromoCode>[] = [
  { key: "code", label: "Code", render: (p) => <span className="font-mono font-semibold">{p.code}</span> },
  { key: "influencer_name", label: "Owner / Influencer" },
  { key: "discount", label: "Discount", render: (p) => p.discount_type === "percentage" ? `${p.discount_value}%` : `₦${Number(p.discount_value).toLocaleString()}` },
  { key: "commission_percentage", label: "Commission", render: (p) => `${p.commission_percentage}%` },
  { key: "usage_count", label: "Used", render: (p) => `${p.usage_count}${p.max_uses ? ` / ${p.max_uses}` : ""}` },
  { key: "revenue_generated", label: "Revenue", render: (p) => `₦${Number(p.revenue_generated || 0).toLocaleString()}` },
  { key: "is_active", label: "Status", render: (p) => <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge> },
  { key: "expires_at", label: "Expires", render: (p) => p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "—" },
];

export default function AdminPromoCodes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState({ ...blank });

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-promo-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promo_codes" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as PromoCode[]);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: form.code.trim().toUpperCase(),
        influencer_name: form.influencer_name || "House",
        influencer_email: form.influencer_email || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        commission_percentage: Number(form.commission_percentage) || 0,
        max_uses: form.max_uses === "" ? null : Number(form.max_uses),
        is_active: form.is_active,
        expires_at: form.expires_at || null,
      };
      if (editing) {
        const { error } = await supabase.from("promo_codes" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        await logAdminActivity("update", "promo_code", editing.id);
      } else {
        const { error } = await supabase.from("promo_codes" as any).insert(payload);
        if (error) throw error;
        await logAdminActivity("create", "promo_code");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promo-codes"] }); setOpen(false); toast({ title: editing ? "Promo code updated" : "Promo code created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_codes" as any).delete().eq("id", id);
      if (error) throw error;
      await logAdminActivity("delete", "promo_code", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promo-codes"] }); toast({ title: "Deleted" }); },
  });

  const startCreate = () => { setEditing(null); setForm({ ...blank }); setOpen(true); };
  const startEdit = (p: PromoCode) => {
    setEditing(p);
    setForm({
      code: p.code,
      influencer_name: p.influencer_name,
      influencer_email: p.influencer_email ?? "",
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      commission_percentage: p.commission_percentage,
      max_uses: p.max_uses ?? "",
      is_active: p.is_active,
      expires_at: p.expires_at ? p.expires_at.slice(0, 10) : "",
    });
    setOpen(true);
  };

  return (
    <>
      <AdminCrudTable
        title="Promo Codes"
        data={data}
        columns={columns}
        isLoading={isLoading}
        onAdd={startCreate}
        onEdit={startEdit}
        onDelete={(id) => del.mutate(id)}
        addLabel="New promo code"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Promo Code</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={form.code} required onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" /></div>
              <div><Label>Owner / Influencer</Label><Input value={form.influencer_name} onChange={(e) => setForm({ ...form, influencer_name: e.target.value })} placeholder="House" /></div>
            </div>
            <div><Label>Owner email (optional)</Label><Input type="email" value={form.influencer_email} onChange={(e) => setForm({ ...form, influencer_email: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Discount</Label><Input type="number" min={0} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
              <div><Label>Commission %</Label><Input type="number" min={0} max={100} value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max uses (blank = unlimited)</Label><Input type="number" min={0} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></div>
              <div><Label>Expires</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <Label className="cursor-pointer">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive codes are rejected at checkout.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}