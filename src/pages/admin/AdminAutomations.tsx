import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Play, Send, Zap } from "lucide-react";

type Group = { group: string; items: { key: string; label: string; description: string }[] };

const CATALOG: Group[] = [
  {
    group: "Account",
    items: [
      { key: "welcome", label: "Welcome email", description: "Sent when a new learner signs up." },
      { key: "inactivity_nudge", label: "Inactivity nudge", description: "No lesson opened for 7 days." },
    ],
  },
  {
    group: "Commerce",
    items: [
      { key: "cart_added", label: "Course added to cart", description: "One nudge per course added." },
      { key: "cart_abandoned", label: "Cart abandoned", description: "24h after the cart was left." },
      { key: "purchase_confirmed", label: "Purchase confirmed", description: "Receipt after successful payment." },
      { key: "payment_failed", label: "Payment failed", description: "Order left pending or failed." },
      { key: "installment_due", label: "Instalment due", description: "Reminder before an instalment is due." },
    ],
  },
  {
    group: "Learning",
    items: [
      { key: "enrollment_confirmed", label: "Enrolment confirmed", description: "Access granted to a course." },
      { key: "cohort_access_granted", label: "Cohort access granted", description: "Added to a cohort space." },
      { key: "lesson_unlocked", label: "Lesson unlocked", description: "A new lesson became available." },
      { key: "assignment_published", label: "New assignment or quiz", description: "Published for the learner's cohort." },
      { key: "first_lesson_completed", label: "First lesson completed", description: "Momentum nudge." },
      { key: "first_assignment_submitted", label: "Assignment submitted", description: "Submission receipt." },
      { key: "assignment_graded", label: "Assignment graded", description: "Feedback is ready." },
      { key: "certificate_ready", label: "Certificate ready", description: "Course completed." },
    ],
  },
  {
    group: "Partner program",
    items: [
      { key: "affiliate_application_received", label: "Application received", description: "Partner applied." },
      { key: "affiliate_approved", label: "Application approved", description: "Partner account activated." },
      { key: "affiliate_declined", label: "Application declined", description: "Partner not approved." },
      { key: "affiliate_course_approved", label: "Course approved", description: "A requested course was approved." },
      { key: "affiliate_conversion", label: "New conversion", description: "A referral converted to a sale." },
      { key: "payout_requested", label: "Payout requested", description: "Partner requested a payout." },
      { key: "payout_paid", label: "Payout paid", description: "Payout has been sent." },
    ],
  },
  {
    group: "Support",
    items: [
      { key: "ticket_created", label: "Ticket created", description: "Support request logged." },
      { key: "ticket_resolved", label: "Ticket resolved", description: "Support request closed." },
    ],
  },
];

const ALL_KEYS = CATALOG.flatMap((g) => g.items.map((i) => i.key));

export default function AdminAutomations() {
  const qc = useQueryClient();
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-automations"],
    queryFn: async () => {
      const [{ data: flags }, { data: events }] = await Promise.all([
        supabase.from("site_content").select("key, value").like("key", "automation_%"),
        supabase
          .from("automation_events")
          .select("automation_key, status, created_at, processed_at, error")
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);
      const off = new Set(
        (flags ?? []).filter((f: any) => f.value === "off").map((f: any) => String(f.key).replace(/^automation_/, "")),
      );
      const lastRun = (flags ?? []).find((f: any) => f.key === "automation_last_run")?.value ?? null;
      const stats: Record<string, { sent: number; failed: number; pending: number; last?: string; error?: string }> = {};
      for (const e of (events ?? []) as any[]) {
        const s = (stats[e.automation_key] ??= { sent: 0, failed: 0, pending: 0 });
        if (e.status === "sent") s.sent++;
        else if (e.status === "failed") s.failed++;
        else if (e.status === "pending") s.pending++;
        const when = e.processed_at ?? e.created_at;
        if (e.status === "sent" && (!s.last || when > s.last)) s.last = when;
        if (e.status === "failed" && !s.error) s.error = e.error ?? "Unknown error";
      }
      return { off, lastRun, stats };
    },
  });

  const toggle = async (key: string, enabled: boolean) => {
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: `automation_${key}`, value: enabled ? "on" : "off", content_type: "setting" } as any, {
        onConflict: "key",
      });
    if (error) return toast.error(error.message);
    toast.success(`${key} ${enabled ? "enabled" : "paused"}`);
    qc.invalidateQueries({ queryKey: ["admin-automations"] });
  };

  const runNow = async () => {
    setRunning(true);
    const { data: res, error } = await supabase.functions.invoke("run-automations", { body: {} });
    setRunning(false);
    if (error) return toast.error(error.message);
    toast.success(`Queue drained — ${(res as any)?.sent ?? 0} sent, ${(res as any)?.skipped ?? 0} skipped`);
    qc.invalidateQueries({ queryKey: ["admin-automations"] });
  };

  const sendTest = async (key: string) => {
    if (!testEmail.trim()) return toast.error("Enter a test recipient email first");
    setTesting(key);
    const { data: res, error } = await supabase.functions.invoke("run-automations", {
      body: { test_key: key, to: testEmail.trim() },
    });
    setTesting(null);
    if (error || (res as any)?.ok === false) {
      return toast.error(error?.message ?? "Test send failed — check the email delivery log");
    }
    toast.success(`Test "${key}" sent to ${testEmail.trim()}`);
  };

  const totals = ALL_KEYS.reduce(
    (acc, k) => {
      const s = data?.stats?.[k];
      acc.sent += s?.sent ?? 0;
      acc.failed += s?.failed ?? 0;
      acc.pending += s?.pending ?? 0;
      return acc;
    },
    { sent: 0, failed: 0, pending: 0 },
  );

  if (isLoading) {
    return <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Automation runner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Last run", value: data?.lastRun ? new Date(data.lastRun).toLocaleString() : "Never" },
              { label: "Sent", value: String(totals.sent) },
              { label: "Queued", value: String(totals.pending) },
              { label: "Failed", value: String(totals.failed) },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-medium text-sm mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="Test recipient email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="sm:max-w-xs"
            />
            <Button onClick={runNow} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run queue now
            </Button>
          </div>
        </CardContent>
      </Card>

      {CATALOG.map((group) => (
        <Card key={group.group}>
          <CardHeader className="pb-2"><CardTitle className="text-base">{group.group}</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border/50">
            {group.items.map((item) => {
              const enabled = !data?.off?.has(item.key);
              const s = data?.stats?.[item.key];
              return (
                <div key={item.key} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{item.label}</p>
                      {!enabled && <Badge variant="secondary">Paused</Badge>}
                      {!!s?.failed && <Badge variant="destructive">{s.failed} failed</Badge>}
                      {!!s?.pending && <Badge variant="outline">{s.pending} queued</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {s?.sent ? `${s.sent} sent` : "No sends yet"}
                      {s?.last && ` · last ${new Date(s.last).toLocaleString()}`}
                      {s?.error && ` · last error: ${s.error}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={testing === item.key}
                      onClick={() => sendTest(item.key)}
                    >
                      {testing === item.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Test
                    </Button>
                    <Switch checked={enabled} onCheckedChange={(v) => toggle(item.key, v)} aria-label={`Toggle ${item.label}`} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
