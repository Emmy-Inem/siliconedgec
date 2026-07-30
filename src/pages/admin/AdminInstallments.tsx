import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, AlarmClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/format-currency";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  completed: "secondary",
  defaulted: "destructive",
};

export default function AdminInstallments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [payFor, setPayFor] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ user_id: "", course_id: "", total: "", installments: "2", first: "", days: "30", next_due: "" });
  const [learnerQuery, setLearnerQuery] = useState("");
  const [pay, setPay] = useState({ amount: "", reference: "", days: "30", next_due: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-installments"],
    queryFn: async () => {
      const [{ data: plans }, { data: courses }, { data: allProfiles }] = await Promise.all([
        supabase.from("installment_plans").select("*").order("created_at", { ascending: false }),
        supabase.from("courses").select("id, title, price").order("title"),
        supabase.from("profiles").select("user_id, full_name").order("full_name"),
      ]);
      return { plans: plans ?? [], courses: courses ?? [], profiles: allProfiles ?? [] };
    },
  });

  const nameFor = (id: string) => (data?.profiles ?? []).find((p: any) => p.user_id === id)?.full_name ?? id.slice(0, 8);
  const courseFor = (id: string) => (data?.courses ?? []).find((c: any) => c.id === id)?.title ?? "—";

  const createPlan = async () => {
    setBusy(true);
    try {
      const { error } = await (supabase.rpc as any)("admin_create_installment_plan", {
        p_user_id: form.user_id,
        p_course_id: form.course_id,
        p_total_amount: Number(form.total),
        p_total_installments: Number(form.installments),
        p_first_payment: Number(form.first || 0),
        p_access_days: Number(form.days || 30),
        p_next_due: form.next_due || null,
        p_note: null,
      });
      if (error) throw error;
      setCreateOpen(false);
      setForm({ user_id: "", course_id: "", total: "", installments: "2", first: "", days: "30", next_due: "" });
      setLearnerQuery("");
      qc.invalidateQueries({ queryKey: ["admin-installments"] });
      toast({ title: "Plan created", description: "Access granted for the payment window." });
    } catch (e: any) {
      toast({ title: "Could not create plan", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const recordPayment = async () => {
    if (!payFor) return;
    setBusy(true);
    try {
      const { error } = await (supabase.rpc as any)("admin_record_installment_payment", {
        p_plan_id: payFor.id,
        p_amount: Number(pay.amount),
        p_reference: pay.reference || null,
        p_extend_days: Number(pay.days || 30),
        p_next_due: pay.next_due || null,
      });
      if (error) throw error;
      setPayFor(null);
      setPay({ amount: "", reference: "", days: "30", next_due: "" });
      qc.invalidateQueries({ queryKey: ["admin-installments"] });
      toast({ title: "Payment recorded" });
    } catch (e: any) {
      toast({ title: "Could not record payment", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const runExpiry = async () => {
    const { data: n, error } = await (supabase.rpc as any)("expire_overdue_installments");
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["admin-installments"] });
    toast({ title: `${n ?? 0} overdue plan(s) revoked` });
  };

  const rows = (data?.plans ?? []).filter((p: any) =>
    !q.trim() ? true : `${nameFor(p.user_id)} ${courseFor(p.course_id)}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base">Part payment plans</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search learner or course" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button variant="outline" className="gap-2" onClick={runExpiry}>
              <AlarmClock className="h-4 w-4" /> Revoke overdue
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> New plan</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create installment plan</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="ip-learner">Learner</Label>
                    <Input
                      id="ip-learner"
                      placeholder="Search by name"
                      value={form.user_id ? nameFor(form.user_id) : learnerQuery}
                      onChange={(e) => { setLearnerQuery(e.target.value); setForm({ ...form, user_id: "" }); }}
                    />
                    {!form.user_id && learnerQuery.trim().length > 1 && (
                      <ul className="max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border">
                        {(data?.profiles ?? [])
                          .filter((p: any) => (p.full_name || "").toLowerCase().includes(learnerQuery.toLowerCase()))
                          .slice(0, 8)
                          .map((p: any) => (
                            <li key={p.user_id}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                                onClick={() => { setForm({ ...form, user_id: p.user_id }); setLearnerQuery(""); }}
                              >
                                {p.full_name || p.user_id.slice(0, 8)}
                              </button>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                      <SelectContent>
                        {(data?.courses ?? []).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="ip-total">Total amount (₦)</Label>
                      <Input id="ip-total" type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ip-count">Installments</Label>
                      <Input id="ip-count" type="number" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ip-first">First payment (₦)</Label>
                      <Input id="ip-first" type="number" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ip-days">Access days</Label>
                      <Input id="ip-days" type="number" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ip-due">Next due date</Label>
                    <Input id="ip-due" type="date" value={form.next_due} onChange={(e) => setForm({ ...form, next_due: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createPlan} disabled={busy || !form.user_id || !form.course_id || !form.total}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create plan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No installment plans yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead><TableHead>Course</TableHead><TableHead>Paid / Total</TableHead>
                  <TableHead>Installments</TableHead><TableHead>Next due</TableHead><TableHead>Access until</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p: any) => {
                  const expired = p.access_expires_at && new Date(p.access_expires_at) <= new Date();
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{nameFor(p.user_id)}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{courseFor(p.course_id)}</TableCell>
                      <TableCell>{formatNaira(Number(p.amount_paid ?? 0))} / {formatNaira(Number(p.total_amount ?? 0))}</TableCell>
                      <TableCell>{p.installments_paid}/{p.total_installments}</TableCell>
                      <TableCell>{p.next_due_date ? new Date(p.next_due_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className={expired ? "text-destructive" : undefined}>
                        {p.access_expires_at ? new Date(p.access_expires_at).toLocaleDateString() : "Permanent"}
                      </TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[p.status] ?? "secondary"} className="capitalize">{p.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setPayFor(p)} disabled={p.status === "completed"}>
                          Record payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record part payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="pp-amount">Amount (₦)</Label>
              <Input id="pp-amount" type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-ref">Reference (optional)</Label>
              <Input id="pp-ref" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pp-days">Extend access (days)</Label>
                <Input id="pp-days" type="number" value={pay.days} onChange={(e) => setPay({ ...pay, days: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pp-due">Next due date</Label>
                <Input id="pp-due" type="date" value={pay.next_due} onChange={(e) => setPay({ ...pay, next_due: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Completing the balance makes access permanent. Otherwise access is extended and revoked automatically when the window lapses.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={recordPayment} disabled={busy || !Number(pay.amount)}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}