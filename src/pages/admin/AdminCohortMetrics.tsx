import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Users, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Per-cohort scorecard: roster size, avg course progress, completion %,
 * assignment submission %, and quiz pass rate for every cohort.
 */
export default function AdminCohortMetrics() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-cohort-metrics"],
    queryFn: async () => {
      const [cohorts, members, courses, enrollments, assignments, submissions, quizzes, attempts] = await Promise.all([
        fetchAllRows<any>("cohorts", "id, name, cohort_number, course_id, status, start_date, end_date"),
        fetchAllRows<any>("cohort_members", "cohort_id, user_id, role"),
        fetchAllRows<any>("courses", "id, title"),
        fetchAllRows<any>("enrollments", "user_id, course_id, progress_percentage, is_completed"),
        fetchAllRows<any>("assignments", "id, lesson_id, is_visible"),
        fetchAllRows<any>("assignment_submissions", "assignment_id, user_id, grade"),
        fetchAllRows<any>("quizzes", "id, lesson_id, passing_score, is_visible"),
        fetchAllRows<any>("quiz_attempts", "quiz_id, user_id, score"),
      ]);
      const lessonCourseMap = new Map<string, string>();
      const { data: lessons } = await (supabase as any).from("lessons").select("id, module_id, modules(course_id)");
      (lessons || []).forEach((l: any) => lessonCourseMap.set(l.id, l?.modules?.course_id));

      const courseTitle = new Map(courses.map((c: any) => [c.id, c.title]));

      return cohorts.map((c: any) => {
        const roster = members.filter((m: any) => m.cohort_id === c.id && m.role !== "instructor");
        const memberIds = new Set(roster.map((r: any) => r.user_id));
        const cohortEnrolls = enrollments.filter((e: any) => e.course_id === c.course_id && memberIds.has(e.user_id));
        const avgProgress = cohortEnrolls.length
          ? Math.round(cohortEnrolls.reduce((s: number, e: any) => s + (e.progress_percentage ?? 0), 0) / cohortEnrolls.length)
          : 0;
        const completed = cohortEnrolls.filter((e: any) => e.is_completed).length;
        const completionRate = cohortEnrolls.length ? Math.round((completed / cohortEnrolls.length) * 100) : 0;

        const courseAssignments = assignments.filter(
          (a: any) => a.is_visible && lessonCourseMap.get(a.lesson_id) === c.course_id,
        );
        const expectedSubs = courseAssignments.length * memberIds.size;
        const actualSubs = submissions.filter(
          (s: any) => memberIds.has(s.user_id) && courseAssignments.some((a: any) => a.id === s.assignment_id),
        ).length;
        const submissionRate = expectedSubs ? Math.round((actualSubs / expectedSubs) * 100) : 0;

        const courseQuizzes = quizzes.filter(
          (q: any) => q.is_visible && lessonCourseMap.get(q.lesson_id) === c.course_id,
        );
        const cohortAttempts = attempts.filter(
          (a: any) => memberIds.has(a.user_id) && courseQuizzes.some((qq: any) => qq.id === a.quiz_id),
        );
        const passing = cohortAttempts.filter((a: any) => {
          const qq = courseQuizzes.find((x: any) => x.id === a.quiz_id);
          return qq && a.score >= (qq.passing_score ?? 70);
        }).length;
        const passRate = cohortAttempts.length ? Math.round((passing / cohortAttempts.length) * 100) : 0;

        return {
          id: c.id,
          label: c.cohort_number ? `Cohort ${c.cohort_number}` : "",
          name: c.name,
          status: c.status,
          course: courseTitle.get(c.course_id) ?? "—",
          members: roster.length,
          avgProgress,
          completionRate,
          submissionRate,
          passRate,
          start_date: c.start_date,
        };
      }).sort((a: any, b: any) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
    },
  });

  const rows = useMemo(
    () => (data ?? []).filter((r: any) =>
      !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.course ?? "").toLowerCase().includes(q.toLowerCase()),
    ),
    [data, q],
  );

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Cohort Scorecard</h2>
        <p className="text-sm text-muted-foreground">Cross-cohort comparison of engagement, completion and assessment performance.</p>
      </div>
      <Input placeholder="Search cohort or course…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="grid gap-3">
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No cohorts match.</Card>}
        {rows.map((r: any) => (
          <Card key={r.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.label && <Badge variant="secondary">{r.label}</Badge>}
                  <span className="font-semibold">{r.name}</span>
                  <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.course}</div>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />{r.members} learners
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric icon={<TrendingUp className="h-3.5 w-3.5" />} label="Avg progress" value={r.avgProgress} />
              <Metric icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Course completion" value={r.completionRate} />
              <Metric icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Assignments submitted" value={r.submissionRate} />
              <Metric icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Quiz pass rate" value={r.passRate} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-lg font-semibold tabular-nums">{value}%</span>
        <Progress value={value} className="h-1.5 flex-1" />
      </div>
    </div>
  );
}