import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { formatNaira } from "@/lib/format-currency";

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-muted text-muted-foreground",
};

interface Payout {
  id: string;
  payee_user_id: string | null;
  payee_name: string;
  payee_type: string;
  amount: number;
  currency: string;
  period_start: string | null;
  period_end: string | null;
  method: string | null;
  status: string;
  reference: string | null;
  notes: string | null;
  processed_at: string | null;
  created_at: string;
}

export default function AdminPayouts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payout | null>(null);
  const [form, setForm] = useState({
    payee_name: "", payee_type: "instructor", amount: "",
    period_start: "", period_end: "", method: "bank_transfer",
    status: "pending", reference: "", notes: "",
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["finance-payouts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("finance_payouts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Payout[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        payee_name: form.payee_name,
        payee_type: form.payee_type,
        amount: Number(form.amount) || 0,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        method: form.method || null,
        status: form.status,
        reference: form.reference || null,
        notes: form.notes || null,
      };
      if (form.status === "paid") {
        payload.processed_at = new Date().toISOString();
        payload.processed_by = user?.id;
      }
      if (editing) {
        const { error } = await (supabase as any).from("finance_payouts").update(payload).eq("id", editing.id);
        if (error) throw error;
        await logAdminActivity("update", "payout", editing.id, payload);
      } else {
        const { error } = await (supabase as any).from("finance_payouts").insert(payload);
        if (error) throw error;
        await logAdminActivity("create", "payout", form.payee_name, payload);
      }
    },
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["finance-payouts"] });
      toast({ title: editing ? "Payout updated" : "Payout recorded" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("finance_payouts").delete().eq("id", id);
      if (error) throw error;
      await logAdminActivity("delete", "payout", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-payouts"] }); toast({ title: "Payout removed" }); },
  });

  const columns: Column<Payout>[] = [
    { key: "payee_name", label: "Payee", render: (p) => <div><div className="font-medium">{p.payee_name}</div><div className="text-[11px] text-muted-foreground capitalize">{p.payee_type}</div></div> },
    { key: "amount", label: "Amount", render: (p) => <span className="font-medium">{formatNaira(Number(p.amount))}</span> },
    { key: "period", label: "Period", render: (p) => p.period_start ? `${p.period_start} → ${p.period_end ?? "—"}` : "—" },
    { key: "method", label: "Method", render: (p) => <span className="capitalize text-xs">{(p.method ?? "—").replace(/_/g, " ")}</span> },
    { key: "status", label: "Status", render: (p) => <Badge className={STATUS_CLASS[p.status] ?? ""}>{p.status}</Badge> },
    { key: "reference", label: "Reference", render: (p) => <span className="font-mono text-xs">{p.reference || "—"}</span> },
    { key: "created_at", label: "Created", render: (p) => new Date(p.created_at).toLocaleDateString() },
  ];

  return (
    <>
      <AdminCrudTable
        title="Payouts"
        data={data}
        columns={columns}
        isLoading={isLoading}
        addLabel="New Payout"
        onAdd={() => { setEditing(null); setForm({ payee_name: "", payee_type: "instructor", amount: "", period_start: "", period_end: "", method: "bank_transfer", status: "pending", reference: "", notes: "" }); setOpen(true); }}
        onEdit={(p) => { setEditing(p); setForm({ payee_name: p.payee_name, payee_type: p.payee_type, amount: String(p.amount), period_start: p.period_start ?? "", period_end: p.period_end ?? "", method: p.method ?? "bank_transfer", status: p.status, reference: p.reference ?? "", notes: p.notes ?? "" }); setOpen(true); }}
        onDelete={(id) => remove.mutate(id)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit payout" : "Record payout"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payee name</Label>
                <Input value={form.payee_name} onChange={(e) => setForm({ ...form, payee_name: e.target.value })} required />
              </div>
              <div>
                <Label>Payee type</Label>
                <Select value={form.payee_type} onValueChange={(v) => setForm({ ...form, payee_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="influencer">Influencer</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (NGN)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <Label>Method</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="paystack">Paystack</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Period start</Label>
                <Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
              </div>
              <div>
                <Label>Period end</Label>
                <Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference</Label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}