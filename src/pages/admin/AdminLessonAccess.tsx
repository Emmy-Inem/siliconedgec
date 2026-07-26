import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CheckCircle2, Lock, Unlock, Users, Loader2, Circle } from "lucide-react";

const db = supabase as any;

/**
 * Admin-only per-student, per-lesson access tool.
 *
 * Lets staff:
 *  - Pick a course + student
 *  - See each lesson's Locked / Unlocked / Completed state
 *  - Toggle unlock (writes/removes lesson_unlocks — the authoritative signal)
 *  - Toggle "mark complete" (writes lesson_progress) — independent from unlock
 *  - Bulk unlock every lesson for that one student
 *  - Bulk unlock every lesson for every cohort member on that course
 *
 * The DB trigger `log_lesson_unlock_change` records each unlock/revoke into
 * admin_activity_log for the audit trail — nothing extra to wire here.
 */
export default function AdminLessonAccess() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState<string>("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // Course picker
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-lesson-access-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title")
        .order("title");
      return data ?? [];
    },
  });

  // Students with access to this course (cohort members OR enrolled)
  const { data: students = [], isFetching: fetchingStudents } = useQuery({
    queryKey: ["admin-lesson-access-students", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: cohorts } = await db.from("cohorts").select("id").eq("course_id", courseId);
      const cohortIds = (cohorts ?? []).map((c: any) => c.id);
      const ids = new Set<string>();
      if (cohortIds.length) {
        const { data: cm } = await db
          .from("cohort_members")
          .select("user_id")
          .in("cohort_id", cohortIds);
        (cm ?? []).forEach((r: any) => r.user_id && ids.add(r.user_id));
      }
      const { data: enr } = await db
        .from("enrollments")
        .select("user_id, payment_status, access_source")
        .eq("course_id", courseId);
      (enr ?? []).forEach((r: any) => {
        const status = String(r.payment_status ?? "").toLowerCase();
        const source = String(r.access_source ?? "").toLowerCase();
        if (
          ["paid", "success", "completed", "confirmed", "granted"].includes(status) ||
          ["manual_grant", "promo", "bootcamp"].includes(source)
        ) {
          ids.add(r.user_id);
        }
      });
      const list = Array.from(ids);
      if (!list.length) return [];
      const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: list });
      return (profs ?? []).sort((a: any, b: any) =>
        (a.full_name ?? "").localeCompare(b.full_name ?? ""),
      );
    },
  });

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter((s: any) => (s.full_name ?? "").toLowerCase().includes(q));
  }, [students, studentSearch]);

  // Ordered lessons for the course
  const { data: lessons = [] } = useQuery({
    queryKey: ["admin-lesson-access-lessons", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_course_curriculum", { p_course_id: courseId });
      // Curriculum rows are already ordered by module, then lesson.
      return (data ?? []).filter((r: any) => r.lesson_id) as any[];
    },
  });

  // Current unlock + completion state for that one student
  const { data: state, isFetching: fetchingState } = useQuery({
    queryKey: ["admin-lesson-access-state", courseId, studentId, lessons.length],
    enabled: !!courseId && !!studentId && lessons.length > 0,
    queryFn: async () => {
      const lessonIds = lessons.map((l: any) => l.lesson_id);
      const [{ data: unlocks }, { data: progress }] = await Promise.all([
        db.from("lesson_unlocks").select("lesson_id").eq("user_id", studentId).in("lesson_id", lessonIds),
        db.from("lesson_progress").select("lesson_id, is_completed").eq("user_id", studentId).in("lesson_id", lessonIds),
      ]);
      return {
        unlocked: new Set<string>((unlocks ?? []).map((r: any) => r.lesson_id)),
        completed: new Set<string>((progress ?? []).filter((r: any) => r.is_completed).map((r: any) => r.lesson_id)),
      };
    },
  });

  const refreshState = () => {
    qc.invalidateQueries({ queryKey: ["admin-lesson-access-state", courseId, studentId] });
  };

  const setBusyFor = (key: string, val: boolean) => setBusy((b) => ({ ...b, [key]: val }));

  const toggleUnlock = async (lessonId: string, next: boolean) => {
    if (!studentId) return;
    const key = `unlock:${lessonId}`;
    setBusyFor(key, true);
    try {
      if (next) {
        const { data: { user: me } } = await supabase.auth.getUser();
        const { error } = await db
          .from("lesson_unlocks")
          .upsert(
            { user_id: studentId, lesson_id: lessonId, granted_by: me?.id ?? null, note: "admin manual unlock" },
            { onConflict: "user_id,lesson_id" },
          );
        if (error) throw error;
      } else {
        const { error } = await db
          .from("lesson_unlocks")
          .delete()
          .eq("user_id", studentId)
          .eq("lesson_id", lessonId);
        if (error) throw error;
      }
      toast.success(next ? "Lesson unlocked" : "Unlock revoked");
      refreshState();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusyFor(key, false);
    }
  };

  const toggleComplete = async (lessonId: string, next: boolean) => {
    if (!studentId) return;
    const key = `complete:${lessonId}`;
    setBusyFor(key, true);
    try {
      if (next) {
        const { error } = await db.from("lesson_progress").upsert(
          {
            user_id: studentId,
            lesson_id: lessonId,
            is_completed: true,
            is_unlocked: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,lesson_id" },
        );
        if (error) throw error;
      } else {
        const { error } = await db
          .from("lesson_progress")
          .update({ is_completed: false, completed_at: null })
          .eq("user_id", studentId)
          .eq("lesson_id", lessonId);
        if (error) throw error;
      }
      toast.success(next ? "Marked complete" : "Completion cleared");
      refreshState();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusyFor(key, false);
    }
  };

  const unlockAllForStudent = async () => {
    if (!studentId || !lessons.length) return;
    setBusyFor("bulk:student", true);
    try {
      const { data: { user: me } } = await supabase.auth.getUser();
      const rows = lessons.map((l: any) => ({
        user_id: studentId,
        lesson_id: l.lesson_id,
        granted_by: me?.id ?? null,
        note: "admin bulk unlock: student",
      }));
      const { error } = await db.from("lesson_unlocks").upsert(rows, { onConflict: "user_id,lesson_id" });
      if (error) throw error;
      toast.success(`Unlocked all ${lessons.length} lessons for this student`);
      refreshState();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusyFor("bulk:student", false);
    }
  };

  const unlockAllForCohort = async () => {
    if (!courseId || !lessons.length) return;
    setBusyFor("bulk:cohort", true);
    try {
      const { data: cohorts } = await db.from("cohorts").select("id").eq("course_id", courseId);
      const cohortIds = (cohorts ?? []).map((c: any) => c.id);
      if (!cohortIds.length) {
        toast.info("No cohort attached to this course.");
        return;
      }
      const { data: cm } = await db.from("cohort_members").select("user_id").in("cohort_id", cohortIds);
      const userIds = Array.from(new Set((cm ?? []).map((r: any) => r.user_id).filter(Boolean)));
      if (!userIds.length) {
        toast.info("No cohort members yet.");
        return;
      }
      const { data: { user: me } } = await supabase.auth.getUser();
      const rows: any[] = [];
      for (const uid of userIds) {
        for (const l of lessons) {
          rows.push({
            user_id: uid,
            lesson_id: l.lesson_id,
            granted_by: me?.id ?? null,
            note: "admin bulk unlock: cohort",
          });
        }
      }
      const { error } = await db.from("lesson_unlocks").upsert(rows, { onConflict: "user_id,lesson_id" });
      if (error) throw error;
      toast.success(`Unlocked every lesson for ${userIds.length} cohort member${userIds.length === 1 ? "" : "s"}`);
      refreshState();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusyFor("bulk:cohort", false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Course</Label>
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); setStudentId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select a course…" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {courses.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Student</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search students…"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                disabled={!courseId}
              />
              <Select value={studentId} onValueChange={setStudentId} disabled={!courseId}>
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue placeholder={fetchingStudents ? "Loading…" : "Pick student"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {filteredStudents.map((s: any) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.full_name ?? "Unnamed"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {courseId && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              disabled={!studentId || busy["bulk:student"]}
              onClick={unlockAllForStudent}
            >
              <Unlock className="h-3.5 w-3.5 mr-1.5" />
              Unlock every lesson for this student
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy["bulk:cohort"]}
              onClick={unlockAllForCohort}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Unlock every lesson for every cohort member
            </Button>
          </div>
        )}
      </Card>

      {courseId && studentId && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-heading font-semibold text-sm">Per-lesson access</h3>
            {fetchingState && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <ul className="divide-y divide-border">
            {lessons.map((l: any, i: number) => {
              const unlocked = !!state?.unlocked.has(l.lesson_id);
              const completed = !!state?.completed.has(l.lesson_id);
              return (
                <li key={l.lesson_id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-6 text-xs tabular-nums text-muted-foreground">{i + 1}.</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{l.lesson_title}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span className="truncate">{l.module_title}</span>
                      {completed ? (
                        <Badge variant="outline" className="text-[10px] gap-1 border-green-500/50 text-green-600">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </Badge>
                      ) : unlocked ? (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Circle className="h-3 w-3" /> Unlocked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                          <Lock className="h-3 w-3" /> Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`u-${l.lesson_id}`}
                        checked={unlocked}
                        disabled={!!busy[`unlock:${l.lesson_id}`]}
                        onCheckedChange={(v) => toggleUnlock(l.lesson_id, v)}
                      />
                      <Label htmlFor={`u-${l.lesson_id}`} className="text-[11px]">Unlock</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`c-${l.lesson_id}`}
                        checked={completed}
                        disabled={!!busy[`complete:${l.lesson_id}`]}
                        onCheckedChange={(v) => toggleComplete(l.lesson_id, v)}
                      />
                      <Label htmlFor={`c-${l.lesson_id}`} className="text-[11px]">Complete</Label>
                    </div>
                  </div>
                </li>
              );
            })}
            {lessons.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No lessons in this course yet.
              </li>
            )}
          </ul>
          <p className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border">
            Every unlock / revoke is recorded in the admin activity log for audit.
          </p>
        </Card>
      )}
    </div>
  );
}