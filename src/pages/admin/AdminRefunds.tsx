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

const STATUS_VARIANT: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  processed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

interface Refund {
  id: string;
  order_id: string | null;
  user_id: string | null;
  amount: number;
  currency: string;
  reason: string | null;
  status: string;
  provider_reference: string | null;
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
}

export default function AdminRefunds() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Refund | null>(null);
  const [form, setForm] = useState({ order_id: "", amount: "", reason: "", status: "pending", notes: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["finance-refunds"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("finance_refunds").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Refund[];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders-for-refunds"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id, reference, amount, user_id, status").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        order_id: form.order_id || null,
        amount: Number(form.amount) || 0,
        reason: form.reason || null,
        status: form.status,
        notes: form.notes || null,
      };
      const order = (orders as any[]).find((o) => o.id === form.order_id);
      if (order) payload.user_id = order.user_id;
      if (form.status === "processed") {
        payload.processed_at = new Date().toISOString();
        payload.processed_by = user?.id;
      }
      if (editing) {
        const { error } = await (supabase as any).from("finance_refunds").update(payload).eq("id", editing.id);
        if (error) throw error;
        await logAdminActivity("update", "refund", editing.id, payload);
      } else {
        const { error } = await (supabase as any).from("finance_refunds").insert(payload);
        if (error) throw error;
        await logAdminActivity("create", "refund", form.order_id || "manual", payload);
      }
    },
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["finance-refunds"] });
      toast({ title: editing ? "Refund updated" : "Refund recorded" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("finance_refunds").delete().eq("id", id);
      if (error) throw error;
      await logAdminActivity("delete", "refund", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-refunds"] });
      toast({ title: "Refund removed" });
    },
  });

  const orderMap = new Map((orders as any[]).map((o) => [o.id, o.reference]));

  const columns: Column<Refund>[] = [
    { key: "order_id", label: "Order", render: (r) => <span className="font-mono text-xs">{(orderMap.get(r.order_id ?? "") as string) ?? (r.order_id ? `${r.order_id.slice(0, 8)}...` : "—")}</span> },
    { key: "amount", label: "Amount", render: (r) => <span className="font-medium">{formatNaira(Number(r.amount))}</span> },
    { key: "reason", label: "Reason", render: (r) => <span className="line-clamp-1 max-w-xs text-xs">{r.reason || "—"}</span> },
    { key: "status", label: "Status", render: (r) => <Badge className={STATUS_VARIANT[r.status] ?? ""}>{r.status}</Badge> },
    { key: "processed_at", label: "Processed", render: (r) => r.processed_at ? new Date(r.processed_at).toLocaleDateString() : "—" },
    { key: "created_at", label: "Created", render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <>
      <AdminCrudTable
        title="Refunds"
        data={data}
        columns={columns}
        isLoading={isLoading}
        addLabel="New Refund"
        onAdd={() => { setEditing(null); setForm({ order_id: "", amount: "", reason: "", status: "pending", notes: "" }); setOpen(true); }}
        onEdit={(r) => { setEditing(r); setForm({ order_id: r.order_id ?? "", amount: String(r.amount), reason: r.reason ?? "", status: r.status, notes: r.notes ?? "" }); setOpen(true); }}
        onDelete={(id) => remove.mutate(id)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit refund" : "Record refund"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div>
              <Label>Order</Label>
              <Select value={form.order_id} onValueChange={(v) => setForm({ ...form, order_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select order..." /></SelectTrigger>
                <SelectContent>
                  {(orders as any[]).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.reference} — {formatNaira(Number(o.amount))} ({o.status})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (NGN)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Customer requested..." />
            </div>
            <div>
              <Label>Internal notes</Label>
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