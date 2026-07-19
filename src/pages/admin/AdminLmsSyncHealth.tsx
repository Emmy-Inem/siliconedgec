import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface CourseOpt { id: string; title: string; cohort_only: boolean | null }

/**
 * LMS Sync Health — surfaces mismatches across the four systems that must
 * agree for a learner to have a working course experience:
 *   1. enrollments (paid / granted)
 *   2. cohort_members (for cohort-only courses)
 *   3. lesson_progress (activity)
 *   4. assignment_submissions (assessment activity)
 */
export default function AdminLmsSyncHealth() {
  const [courseId, setCourseId] = useState<string>("");

  const { data: courses = [] } = useQuery({
    queryKey: ["sync-health-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, cohort_only")
        .order("title");
      if (error) throw error;
      return data as CourseOpt[];
    },
  });

  const course = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["sync-health-rows", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      // Users we care about: paid enrollees + cohort members for this course.
      const [enrolRes, cohortRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("user_id, payment_status, access_source, is_completed, progress_percentage")
          .eq("course_id", courseId),
        supabase
          .from("cohorts")
          .select("id, cohort_members(user_id, role)")
          .eq("course_id", courseId),
      ]);
      if (enrolRes.error) throw enrolRes.error;
      if (cohortRes.error) throw cohortRes.error;

      const enrolMap = new Map<string, any>();
      (enrolRes.data ?? []).forEach((e: any) => enrolMap.set(e.user_id, e));

      const cohortSet = new Set<string>();
      (cohortRes.data ?? []).forEach((c: any) =>
        (c.cohort_members ?? []).forEach((m: any) => cohortSet.add(m.user_id))
      );

      const userIds = Array.from(new Set([...enrolMap.keys(), ...cohortSet]));
      if (userIds.length === 0) return [];

      // Profiles + activity in parallel.
      const [profRes, progRes, submRes] = await Promise.all([
        supabase.rpc("get_public_profiles", { p_user_ids: userIds }),
        supabase
          .from("lesson_progress")
          .select("user_id, lesson_id, is_completed, lessons!inner(module_id, modules!inner(course_id))")
          .eq("lessons.modules.course_id", courseId)
          .in("user_id", userIds),
        supabase
          .from("assignment_submissions")
          .select("user_id, assignment_id, grade, assignments!inner(lesson_id, lessons!inner(module_id, modules!inner(course_id)))")
          .eq("assignments.lessons.modules.course_id", courseId)
          .in("user_id", userIds),
      ]);

      const profiles = new Map<string, any>();
      ((profRes.data as any[]) ?? []).forEach((p: any) => profiles.set(p.user_id, p));

      const progressCounts = new Map<string, { total: number; done: number }>();
      ((progRes.data as any[]) ?? []).forEach((r: any) => {
        const cur = progressCounts.get(r.user_id) ?? { total: 0, done: 0 };
        cur.total++;
        if (r.is_completed) cur.done++;
        progressCounts.set(r.user_id, cur);
      });

      const submissionCounts = new Map<string, { total: number; graded: number }>();
      ((submRes.data as any[]) ?? []).forEach((r: any) => {
        const cur = submissionCounts.get(r.user_id) ?? { total: 0, graded: 0 };
        cur.total++;
        if (r.grade != null) cur.graded++;
        submissionCounts.set(r.user_id, cur);
      });

      return userIds.map((uid) => {
        const enrol = enrolMap.get(uid);
        const inCohort = cohortSet.has(uid);
        const hasPaid =
          enrol &&
          (["paid", "success", "completed", "confirmed", "granted"].includes(
            enrol.payment_status ?? ""
          ) || ["manual_grant", "promo", "bootcamp"].includes(enrol.access_source ?? ""));
        const flags: string[] = [];
        if (course?.cohort_only && hasPaid && !inCohort) flags.push("Paid but not in cohort");
        if (course?.cohort_only && inCohort && !hasPaid) flags.push("Cohort member but not enrolled");
        if (!course?.cohort_only && !hasPaid && inCohort) flags.push("Cohort member without paid enrollment");
        return {
          user_id: uid,
          name: profiles.get(uid)?.full_name || "(unknown)",
          payment_status: enrol?.payment_status ?? "—",
          access_source: enrol?.access_source ?? "—",
          in_cohort: inCohort,
          progress: progressCounts.get(uid) ?? { total: 0, done: 0 },
          submissions: submissionCounts.get(uid) ?? { total: 0, graded: 0 },
          flags,
        };
      }).sort((a, b) => b.flags.length - a.flags.length || a.name.localeCompare(b.name));
    },
  });

  const mismatched = rows.filter((r) => r.flags.length);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium">Course</label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">Select a course…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {c.cohort_only ? " (cohort-only)" : ""}
              </option>
            ))}
          </select>
        </div>
        {courseId && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{rows.length} learners</Badge>
            <Badge variant={mismatched.length ? "destructive" : "secondary"}>
              {mismatched.length} mismatches
            </Badge>
          </div>
        )}
      </Card>

      {courseId && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">Learner</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2">Cohort</th>
                  <th className="px-3 py-2">Lessons</th>
                  <th className="px-3 py-2">Submissions</th>
                  <th className="px-3 py-2">Health</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No learners for this course.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.user_id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2">
                      <div>{r.payment_status}</div>
                      {r.access_source !== "—" && (
                        <div className="text-xs text-muted-foreground">via {r.access_source}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.in_cohort ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 tabular-nums">{r.progress.done}/{r.progress.total || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{r.submissions.graded}/{r.submissions.total || "—"}</td>
                    <td className="px-3 py-2">
                      {r.flags.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {r.flags.map((f) => (
                            <span key={f} className="inline-flex items-center gap-1 text-destructive text-xs">
                              <AlertTriangle className="h-3.5 w-3.5" /> {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}