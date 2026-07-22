import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Surfaces learners who are enrolled but stalled:
 *  - no activity in 14+ days, OR
 *  - progress < 20% after 30 days since enrollment, OR
 *  - failed at least one quiz attempt without a passing follow-up.
 */
export default function AdminAtRiskLearners() {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-at-risk"],
    queryFn: async () => {
      const [enrollments, profiles, attempts, quizzes, courses] = await Promise.all([
        fetchAllRows<any>(
          "enrollments",
          "user_id, course_id, progress_percentage, is_completed, created_at, last_seen_at, payment_status, access_source",
        ),
        fetchAllRows<any>("profiles", "user_id, full_name, avatar_url"),
        fetchAllRows<any>("quiz_attempts", "user_id, quiz_id, score, created_at"),
        fetchAllRows<any>("quizzes", "id, passing_score"),
        fetchAllRows<any>("courses", "id, title"),
      ]);
      const profMap = new Map(profiles.map((p: any) => [p.user_id, p]));
      const courseMap = new Map(courses.map((c: any) => [c.id, c.title]));
      const passing = new Map<string, number>(quizzes.map((q: any) => [q.id, q.passing_score ?? 70]));

      const now = Date.now();
      const rows: any[] = [];

      for (const e of enrollments) {
        if (e.is_completed) continue;
        const hasAccess =
          ["paid", "success", "completed", "confirmed", "granted"].includes(e.payment_status ?? "") ||
          ["manual_grant", "promo", "bootcamp"].includes(e.access_source ?? "");
        if (!hasAccess) continue;

        const lastSeen = e.last_seen_at ? new Date(e.last_seen_at).getTime() : null;
        const created = e.created_at ? new Date(e.created_at).getTime() : now;
        const daysSinceSeen = lastSeen ? Math.round((now - lastSeen) / 86400000) : null;
        const daysSinceStart = Math.round((now - created) / 86400000);
        const progress = e.progress_percentage ?? 0;

        const userAttempts = attempts.filter((a: any) => a.user_id === e.user_id);
        const anyFailed = userAttempts.some((a: any) => a.score < (passing.get(a.quiz_id) ?? 70));
        const anyPassed = userAttempts.some((a: any) => a.score >= (passing.get(a.quiz_id) ?? 70));
        const failedOnly = anyFailed && !anyPassed;

        const reasons: string[] = [];
        if (daysSinceSeen !== null && daysSinceSeen >= 14) reasons.push(`Inactive ${daysSinceSeen}d`);
        if (lastSeen === null && daysSinceStart >= 7) reasons.push("Never opened");
        if (progress < 20 && daysSinceStart >= 30) reasons.push(`Only ${progress}% after 30d`);
        if (failedOnly) reasons.push("Failed quiz, no pass");

        if (reasons.length === 0) continue;

        const p = profMap.get(e.user_id) as any;
        rows.push({
          user_id: e.user_id,
          name: p?.full_name || "Unnamed",
          course: courseMap.get(e.course_id) ?? "—",
          progress,
          daysSinceSeen,
          reasons,
          severity: reasons.length >= 2 ? "high" : "medium",
        });
      }
      return rows.sort((a, b) => b.reasons.length - a.reasons.length || (b.daysSinceSeen ?? 0) - (a.daysSinceSeen ?? 0));
    },
  });

  const filtered = useMemo(
    () => (data ?? []).filter((r) =>
      !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.course.toLowerCase().includes(q.toLowerCase()),
    ),
    [data, q],
  );

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />At-Risk Learners</h2>
        <p className="text-sm text-muted-foreground">
          Enrolled learners who are inactive, behind schedule, or failing quizzes. Reach out to unblock them.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Input placeholder="Search learner or course…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Badge variant="outline">{filtered.length} flagged</Badge>
      </div>
      <div className="grid gap-3">
        {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Everyone is on track. 🎉</Card>}
        {filtered.map((r, i) => (
          <Card key={`${r.user_id}-${i}`} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{r.name}</span>
                <Badge variant={r.severity === "high" ? "destructive" : "secondary"}>{r.severity}</Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">{r.course} · {r.progress}% progress</div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {r.reasons.map((rs: string) => (
                  <Badge key={rs} variant="outline" className="text-[10px]">{rs}</Badge>
                ))}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              (supabase as any).from("notifications").insert({
                user_id: r.user_id,
                title: "We miss you 👋",
                message: `Keep going with ${r.course}. Your instructor is here if you need help.`,
                type: "info",
                link: "/dashboard",
              });
            }}>
              <Mail className="h-3.5 w-3.5 mr-1.5" />Nudge
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}