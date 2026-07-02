import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, Lock, Search, ShieldCheck, Loader2, X } from "lucide-react";

interface Props {
  courseId: string;
  currentLessonId: string;
  nextLessonId: string | null;
}

interface Row {
  user_id: string;
  full_name: string;
  email?: string | null;
  completed_current: boolean;
  approved_next: boolean;
}

const db = supabase as any;

/**
 * Staff-only panel embedded inside the CourseLearning page.
 * Lets admins/instructors approve which students may access the next
 * lesson. Only rendered when the caller determines the viewer is staff.
 */
export function LessonApprovalPanel({ courseId, currentLessonId, nextLessonId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    // 1. enrolled students on this course
    const { data: enrolls } = await db
      .from("enrollments")
      .select("user_id, payment_status")
      .eq("course_id", courseId);
    const paid = (enrolls ?? []).filter((e: any) =>
      ["paid", "success", "completed", "confirmed"].includes(String(e.payment_status ?? "").toLowerCase()),
    );
    const userIds: string[] = paid.map((e: any) => e.user_id);
    if (userIds.length === 0) {
      setRows([]); setLoading(false); return;
    }
    // 2. profile lookup
    const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: userIds });
    const profMap = new Map<string, any>();
    (profs ?? []).forEach((p: any) => profMap.set(p.user_id, p));
    // 3. lesson_progress for current lesson
    const { data: progs } = await db
      .from("lesson_progress")
      .select("user_id, is_completed")
      .eq("lesson_id", currentLessonId)
      .in("user_id", userIds);
    const doneSet = new Set((progs ?? []).filter((p: any) => p.is_completed).map((p: any) => p.user_id));
    // 4. approvals for next lesson
    let approvedSet = new Set<string>();
    if (nextLessonId) {
      const { data: apps } = await db
        .from("lesson_unlocks")
        .select("user_id")
        .eq("lesson_id", nextLessonId)
        .in("user_id", userIds);
      approvedSet = new Set((apps ?? []).map((a: any) => a.user_id));
    }
    setRows(
      userIds.map((uid) => ({
        user_id: uid,
        full_name: profMap.get(uid)?.full_name ?? "Student",
        completed_current: doneSet.has(uid),
        approved_next: approvedSet.has(uid),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (courseId && currentLessonId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, currentLessonId, nextLessonId]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const term = q.toLowerCase();
    return rows.filter((r) => r.full_name.toLowerCase().includes(term));
  }, [rows, q]);

  const approve = async (userId: string, grant: boolean) => {
    if (!nextLessonId) return;
    setBusy((b) => ({ ...b, [userId]: true }));
    if (grant) {
      const { data: { user: me } } = await supabase.auth.getUser();
      const { error } = await db.from("lesson_unlocks").upsert(
        { user_id: userId, lesson_id: nextLessonId, granted_by: me?.id ?? null },
        { onConflict: "user_id,lesson_id" },
      );
      if (error) toast.error(error.message); else toast.success("Approved");
    } else {
      const { error } = await db
        .from("lesson_unlocks")
        .delete()
        .eq("user_id", userId)
        .eq("lesson_id", nextLessonId);
      if (error) toast.error(error.message); else toast.success("Approval revoked");
    }
    setBusy((b) => ({ ...b, [userId]: false }));
    load();
  };

  const approveAllReady = async () => {
    const ready = rows.filter((r) => r.completed_current && !r.approved_next);
    if (!ready.length || !nextLessonId) return;
    const { data: { user: me } } = await supabase.auth.getUser();
    const { error } = await db.from("lesson_unlocks").upsert(
      ready.map((r) => ({ user_id: r.user_id, lesson_id: nextLessonId, granted_by: me?.id ?? null })),
      { onConflict: "user_id,lesson_id" },
    );
    if (error) toast.error(error.message);
    else toast.success(`Approved ${ready.length} student${ready.length === 1 ? "" : "s"}`);
    load();
  };

  return (
    <Card className="p-4 border-primary/30 bg-primary/[0.03]">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Instructor: Approve next lesson</h3>
          <Badge variant="outline" className="text-[10px]">Staff only</Badge>
        </div>
        {nextLessonId && (
          <Button size="sm" variant="secondary" onClick={approveAllReady} disabled={loading}>
            Approve all who finished
          </Button>
        )}
      </div>
      {!nextLessonId ? (
        <p className="text-xs text-muted-foreground">This is the final lesson — no approvals needed.</p>
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-8 pl-7 text-xs" placeholder="Search students…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {loading ? (
            <div className="py-6 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No enrolled students yet.</p>
          ) : (
            <ul className="divide-y divide-border max-h-72 overflow-y-auto">
              {filtered.map((r) => (
                <li key={r.user_id} className="flex items-center gap-2 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{r.full_name}</div>
                    <div className="text-[11px] text-muted-foreground flex gap-2">
                      {r.completed_current ? (
                        <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" />Finished current</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" />Not yet finished</span>
                      )}
                    </div>
                  </div>
                  {r.approved_next ? (
                    <Button size="sm" variant="ghost" disabled={busy[r.user_id]} onClick={() => approve(r.user_id, false)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Revoke
                    </Button>
                  ) : (
                    <Button size="sm" disabled={busy[r.user_id]} onClick={() => approve(r.user_id, true)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}