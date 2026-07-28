import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Circle, Loader2, Lock, Unlock, Users } from "lucide-react";

const db = supabase as any;

/**
 * Per-member lesson unlock / completion control scoped to this cohort's course.
 * Writes to `lesson_unlocks` (authoritative) and `lesson_progress` (completion).
 */
export function CohortLessonsPanel({ cohortId, courseId }: { cohortId: string; courseId: string | null }) {
  const [members, setMembers] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const [studentId, setStudentId] = useState("");
  const [lessons, setLessons] = useState<any[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: cm } = await db.from("cohort_members").select("user_id").eq("cohort_id", cohortId);
      const ids: string[] = Array.from(new Set((cm ?? []).map((r: any) => r.user_id).filter(Boolean)));
      if (!ids.length) return setMembers([]);
      const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: ids });
      setMembers((profs ?? []).sort((a: any, b: any) => (a.full_name ?? "").localeCompare(b.full_name ?? "")) as any);
    })();
  }, [cohortId]);

  useEffect(() => {
    if (!courseId) return;
    supabase.rpc("get_course_curriculum", { p_course_id: courseId }).then(({ data }) => {
      setLessons((data ?? []).filter((r: any) => r.lesson_id));
    });
  }, [courseId]);

  const lessonIds = useMemo(() => lessons.map((l) => l.lesson_id), [lessons]);

  const loadState = async () => {
    if (!studentId || !lessonIds.length) return;
    setLoading(true);
    const [{ data: u }, { data: p }] = await Promise.all([
      db.from("lesson_unlocks").select("lesson_id").eq("user_id", studentId).in("lesson_id", lessonIds),
      db.from("lesson_progress").select("lesson_id, is_completed").eq("user_id", studentId).in("lesson_id", lessonIds),
    ]);
    setUnlocked(new Set((u ?? []).map((r: any) => r.lesson_id)));
    setCompleted(new Set((p ?? []).filter((r: any) => r.is_completed).map((r: any) => r.lesson_id)));
    setLoading(false);
  };

  useEffect(() => { loadState(); }, [studentId, lessons.length]);

  const mark = (k: string, v: boolean) => setBusy((b) => ({ ...b, [k]: v }));

  const toggleUnlock = async (lessonId: string, next: boolean) => {
    const key = `u:${lessonId}`; mark(key, true);
    try {
      if (next) {
        const { data: { user: me } } = await supabase.auth.getUser();
        const { error } = await db.from("lesson_unlocks").upsert(
          { user_id: studentId, lesson_id: lessonId, granted_by: me?.id ?? null, note: "admin cohort unlock" },
          { onConflict: "user_id,lesson_id" },
        );
        if (error) throw error;
      } else {
        const { error } = await db.from("lesson_unlocks").delete().eq("user_id", studentId).eq("lesson_id", lessonId);
        if (error) throw error;
      }
      toast.success(next ? "Lesson unlocked" : "Unlock revoked");
      loadState();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); } finally { mark(key, false); }
  };

  const toggleComplete = async (lessonId: string, next: boolean) => {
    const key = `c:${lessonId}`; mark(key, true);
    try {
      if (next) {
        const { error } = await db.from("lesson_progress").upsert(
          { user_id: studentId, lesson_id: lessonId, is_completed: true, is_unlocked: true, completed_at: new Date().toISOString() },
          { onConflict: "user_id,lesson_id" },
        );
        if (error) throw error;
      } else {
        const { error } = await db.from("lesson_progress").update({ is_completed: false, completed_at: null })
          .eq("user_id", studentId).eq("lesson_id", lessonId);
        if (error) throw error;
      }
      toast.success(next ? "Marked complete" : "Completion cleared");
      loadState();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); } finally { mark(key, false); }
  };

  const bulkUnlock = async (scope: "student" | "cohort") => {
    if (!lessons.length) return;
    const key = `bulk:${scope}`; mark(key, true);
    try {
      const targets = scope === "student" ? (studentId ? [studentId] : []) : members.map((m) => m.user_id);
      if (!targets.length) { toast.info("No target members."); return; }
      const { data: { user: me } } = await supabase.auth.getUser();
      const rows = targets.flatMap((uid) =>
        lessons.map((l) => ({ user_id: uid, lesson_id: l.lesson_id, granted_by: me?.id ?? null, note: `admin bulk unlock: ${scope}` })),
      );
      const { error } = await db.from("lesson_unlocks").upsert(rows, { onConflict: "user_id,lesson_id" });
      if (error) throw error;
      toast.success(`Unlocked ${lessons.length} lessons for ${targets.length} member${targets.length === 1 ? "" : "s"}`);
      loadState();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); } finally { mark(key, false); }
  };

  if (!courseId) {
    return <Card className="p-6 text-sm text-muted-foreground text-center">Link a course to this cohort to manage lesson access.</Card>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px]">
          <Label className="text-xs">Member</Label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger><SelectValue placeholder="Pick a member…" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.full_name ?? m.user_id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="secondary" disabled={!studentId || busy["bulk:student"]} onClick={() => bulkUnlock("student")}>
          <Unlock className="h-3.5 w-3.5 mr-1.5" />Unlock all for member
        </Button>
        <Button size="sm" variant="outline" disabled={busy["bulk:cohort"]} onClick={() => bulkUnlock("cohort")}>
          <Users className="h-3.5 w-3.5 mr-1.5" />Unlock all for cohort
        </Button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mb-2" />}
      </div>

      {studentId && (
        <div className="border rounded-lg divide-y">
          {lessons.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No lessons in this course yet.</div>}
          {lessons.map((l, i) => {
            const isU = unlocked.has(l.lesson_id);
            const isC = completed.has(l.lesson_id);
            return (
              <div key={l.lesson_id} className="flex items-center gap-3 p-3">
                <span className="w-6 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{l.lesson_title}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span className="truncate">{l.module_title}</span>
                    {isC ? (
                      <Badge variant="outline" className="text-[10px] gap-1 border-green-500/50 text-green-600"><CheckCircle2 className="h-3 w-3" />Completed</Badge>
                    ) : isU ? (
                      <Badge variant="outline" className="text-[10px] gap-1"><Circle className="h-3 w-3" />Unlocked</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground"><Lock className="h-3 w-3" />Locked</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Switch checked={isU} disabled={!!busy[`u:${l.lesson_id}`]} onCheckedChange={(v) => toggleUnlock(l.lesson_id, v)} />
                    <span className="text-[11px]">Unlock</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={isC} disabled={!!busy[`c:${l.lesson_id}`]} onCheckedChange={(v) => toggleComplete(l.lesson_id, v)} />
                    <span className="text-[11px]">Complete</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}