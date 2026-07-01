import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy, Link as LinkIcon, Mail, Plus, RefreshCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

const db = supabase as any;

type Cohort = {
  id: string;
  name: string;
  slug: string | null;
  start_date: string;
  end_date: string;
  course_id: string | null;
  default_total_amount: number;
  default_installments: number;
  is_active: boolean;
};

type Enrollment = {
  id: string;
  cohort_id: string;
  email: string;
  full_name: string;
  total_amount: number;
  installment_amount: number;
  installments_paid: number;
  total_installments: number;
  next_due_date: string | null;
  status: string;
  access_granted: boolean;
  payment_link: string;
  last_payment_date: string | null;
  created_at: string;
};

export default function AdminBootcamps() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [selected, setSelected] = useState<Cohort | null>(null);
  const [loading, setLoading] = useState(true);
  const [cohortDialog, setCohortDialog] = useState(false);
  const [editing, setEditing] = useState<Cohort | null>(null);
  const [linkDialog, setLinkDialog] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: cs }, { data: cr }] = await Promise.all([
      db.from("bootcamp_cohorts").select("*").order("start_date", { ascending: false }),
      supabase.from("courses").select("id,title").order("title"),
    ]);
    setCohorts(cs || []);
    setCourses((cr as any) || []);
    if (cs && cs.length && !selected) setSelected(cs[0]);
    setLoading(false);
  };

  const loadEnrollments = async (cohortId: string) => {
    const { data } = await db
      .from("bootcamp_enrollments")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("created_at", { ascending: false });
    setEnrollments(data || []);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selected) loadEnrollments(selected.id); }, [selected?.id]);

  const saveCohort = async (form: Partial<Cohort>) => {
    if (editing) {
      const { error } = await db.from("bootcamp_cohorts").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Cohort updated");
    } else {
      const { error } = await db.from("bootcamp_cohorts").insert(form);
      if (error) return toast.error(error.message);
      toast.success("Cohort created");
    }
    setCohortDialog(false);
    setEditing(null);
    load();
  };

  const totals = useMemo(() => {
    const paid = enrollments.filter(e => e.status === "completed").length;
    const overdue = enrollments.filter(e => e.status === "overdue").length;
    const revenue = enrollments.reduce((s, e) => s + (e.installment_amount * e.installments_paid), 0);
    return { paid, overdue, revenue, total: enrollments.length };
  }, [enrollments]);

  return (
    <div className="space-y-6">
      <Helmet><title>Bootcamps · Admin</title></Helmet>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bootcamps</h1>
          <p className="text-sm text-muted-foreground">Manage installment cohorts and per-student payment links.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button onClick={() => { setEditing(null); setCohortDialog(true); }}>
            <Plus className="mr-2 h-4 w-4" />New Cohort
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : cohorts.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No cohorts yet. Create one to start generating installment payment links.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            {cohorts.map(c => (
              <Card
                key={c.id}
                onClick={() => setSelected(c)}
                className={`p-3 cursor-pointer ${selected?.id === c.id ? "border-primary" : ""}`}
              >
                <div className="font-medium text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.start_date} → {c.end_date}</div>
                <div className="mt-1 flex gap-1">
                  {c.is_active ? <Badge>active</Badge> : <Badge variant="secondary">inactive</Badge>}
                </div>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-3 space-y-4">
            {selected && (
              <>
                <Card className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{selected.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        Default plan: {selected.default_installments} installments · ₦{Number(selected.default_total_amount).toLocaleString()} total
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setEditing(selected); setCohortDialog(true); }}>Edit</Button>
                      <Button onClick={() => setLinkDialog(true)}>
                        <LinkIcon className="mr-2 h-4 w-4" />Generate Payment Link
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <Stat label="Enrollments" value={totals.total} />
                    <Stat label="Completed" value={totals.paid} />
                    <Stat label="Overdue" value={totals.overdue} />
                    <Stat label="Revenue (₦)" value={totals.revenue.toLocaleString()} />
                  </div>
                </Card>

                <Card>
                  <div className="p-3 border-b font-medium">Enrollments</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="p-2 text-left">Student</th>
                          <th className="p-2 text-left">Paid</th>
                          <th className="p-2 text-left">Next Due</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map(e => (
                          <tr key={e.id} className="border-t">
                            <td className="p-2">
                              <div className="font-medium">{e.full_name}</div>
                              <div className="text-xs text-muted-foreground">{e.email}</div>
                            </td>
                            <td className="p-2">{e.installments_paid}/{e.total_installments}</td>
                            <td className="p-2">{e.next_due_date ?? "—"}</td>
                            <td className="p-2">
                              <Badge variant={
                                e.status === "completed" ? "default" :
                                e.status === "overdue" ? "destructive" :
                                e.status === "access_revoked" ? "destructive" : "secondary"
                              }>{e.status}</Badge>
                            </td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(e.payment_link); toast.success("Link copied"); }}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" asChild>
                                  <a href={`mailto:${e.email}?subject=Your bootcamp payment link&body=${encodeURIComponent(e.payment_link)}`}><Mail className="h-3 w-3" /></a>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!enrollments.length && (
                          <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No enrollments yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      <CohortForm
        open={cohortDialog}
        onOpenChange={(o) => { setCohortDialog(o); if (!o) setEditing(null); }}
        editing={editing}
        courses={courses}
        onSave={saveCohort}
      />

      <LinkDialog
        open={linkDialog}
        onOpenChange={setLinkDialog}
        cohort={selected}
        generating={generating}
        setGenerating={setGenerating}
        onGenerated={() => selected && loadEnrollments(selected.id)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function CohortForm({ open, onOpenChange, editing, courses, onSave }: any) {
  const [form, setForm] = useState<any>({
    name: "", slug: "", start_date: "2026-07-04", end_date: "2026-08-01",
    default_total_amount: 0, default_installments: 4, course_id: null, is_active: true, description: "",
  });
  useEffect(() => {
    if (editing) setForm(editing);
    else setForm({
      name: "", slug: "", start_date: "2026-07-04", end_date: "2026-08-01",
      default_total_amount: 0, default_installments: 4, course_id: null, is_active: true, description: "",
    });
  }, [editing, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit Cohort" : "New Cohort"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Slug</Label><Input value={form.slug ?? ""} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>End date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Total (₦)</Label><Input type="number" value={form.default_total_amount} onChange={e => setForm({ ...form, default_total_amount: Number(e.target.value) })} /></div>
            <div><Label>Installments</Label><Input type="number" value={form.default_installments} onChange={e => setForm({ ...form, default_installments: Number(e.target.value) })} /></div>
          </div>
          <div>
            <Label>Unlocks course (optional)</Label>
            <Select value={form.course_id ?? "none"} onValueChange={(v) => setForm({ ...form, course_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkDialog({ open, onOpenChange, cohort, generating, setGenerating, onGenerated }: any) {
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    total_amount: 0,
    installments: 4,
    flexible_payment: false,
    final_due_date: "",
  });
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (open && cohort) {
      setForm({
        email: "",
        full_name: "",
        total_amount: cohort.default_total_amount,
        installments: cohort.default_installments,
        flexible_payment: false,
        final_due_date: cohort.end_date || "",
      });
      setLink(null);
    }
  }, [open, cohort]);

  const submit = async () => {
    if (!cohort) return;
    if (!form.total_amount) { toast.error("Enter a total amount"); return; }
    if (!form.flexible_payment && (!form.email || !form.full_name)) {
      toast.error("Email and name required for installment lock mode");
      return;
    }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("bootcamp-generate-link", {
      body: { cohort_id: cohort.id, ...form },
    });
    setGenerating(false);
    if (error || !(data as any)?.success) { toast.error((error as any)?.message || (data as any)?.error || "Failed"); return; }
    const url = (data as any).enrollment.payment_link;
    setLink(url);
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Payment link generated & copied");
    onGenerated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Generate Payment Link</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Flexible payment (no installment lock)</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Payer can pay any amount, any time, until the final deadline. Email & name become optional.
              </p>
            </div>
            <Switch
              checked={form.flexible_payment}
              onCheckedChange={(v) => setForm({ ...form, flexible_payment: v })}
            />
          </div>
          <div>
            <Label>Student email {form.flexible_payment && <span className="text-muted-foreground font-normal">(optional)</span>}</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Full name {form.flexible_payment && <span className="text-muted-foreground font-normal">(optional)</span>}</Label>
            <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Total (₦)</Label><Input type="number" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: Number(e.target.value) })} /></div>
            <div>
              <Label>{form.flexible_payment ? "Final deadline" : "Installments"}</Label>
              {form.flexible_payment ? (
                <Input type="date" value={form.final_due_date} onChange={e => setForm({ ...form, final_due_date: e.target.value })} />
              ) : (
                <Input type="number" value={form.installments} onChange={e => setForm({ ...form, installments: Number(e.target.value) })} />
              )}
            </div>
          </div>
          {form.total_amount > 0 && !form.flexible_payment && (
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              {form.installments} installments of ₦{Math.round(form.total_amount / form.installments).toLocaleString()}
            </div>
          )}
          {form.flexible_payment && form.total_amount > 0 && (
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              Payer chooses any amount up to <strong>₦{Number(form.total_amount).toLocaleString()}</strong>
              {form.final_due_date && <> · due by <strong>{form.final_due_date}</strong></>}
            </div>
          )}
          {link && (
            <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-3 text-sm break-all">{link}</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={submit} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}