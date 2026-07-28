import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { logAdminActivity } from "@/lib/admin-logger";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";

const db = supabase as any;

const PAID = ["paid", "success", "completed", "confirmed", "granted"];
const GRANT_SOURCES = ["manual_grant", "promo", "bootcamp"];

type Row = { user_id: string; full_name: string | null; hasAccess: boolean; source: string | null };

/**
 * Grant / revoke the cohort's linked course for individual members or the
 * whole roster in one click. Uses the manual-grant path
 * (payment_status='granted', access_source='manual_grant').
 */
export function CohortAccessPanel({ cohortId, courseId }: { cohortId: string; courseId: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    const { data: cm } = await db.from("cohort_members").select("user_id").eq("cohort_id", cohortId);
    const ids: string[] = Array.from(new Set((cm ?? []).map((r: any) => r.user_id).filter(Boolean)));
    if (!ids.length) { setRows([]); setLoading(false); return; }
    const [{ data: profs }, { data: enr }] = await Promise.all([
      supabase.rpc("get_public_profiles", { p_user_ids: ids }),
      db.from("enrollments").select("user_id, payment_status, access_source").eq("course_id", courseId).in("user_id", ids),
    ]);
    const enrMap = new Map<string, any>();
    (enr ?? []).forEach((e: any) => enrMap.set(e.user_id, e));
    setRows(
      ids.map((id) => {
        const e = enrMap.get(id);
        const status = String(e?.payment_status ?? "").toLowerCase();
        const source = String(e?.access_source ?? "").toLowerCase();
        return {
          user_id: id,
          full_name: (profs ?? []).find((p: any) => p.user_id === id)?.full_name ?? null,
          hasAccess: PAID.includes(status) || GRANT_SOURCES.includes(source),
          source: e?.access_source ?? e?.payment_status ?? null,
        };
      }).sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "")),
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [cohortId, courseId]);

  const grant = async (userIds: string[]) => {
    if (!courseId || !userIds.length) return;
    const payload = userIds.map((uid) => ({
      user_id: uid,
      course_id: courseId,
      payment_status: "granted",
      access_source: "manual_grant",
      progress_percentage: 0,
      is_completed: false,
    }));
    const { error } = await db.from("enrollments").upsert(payload, { onConflict: "user_id,course_id" });
    if (error) return toast.error(error.message);
    await logAdminActivity("cohort_access_grant", "cohort", cohortId, { course_id: courseId, users: userIds.length });
    toast.success(`Access granted to ${userIds.length} member${userIds.length === 1 ? "" : "s"}`);
    load();
  };

  const revoke = async (userId: string) => {
    if (!courseId) return;
    if (!confirm("Revoke this member's access to the linked course?")) return;
    const { error } = await db.from("enrollments").delete().eq("course_id", courseId).eq("user_id", userId);
    if (error) return toast.error(error.message);
    await logAdminActivity("cohort_access_revoke", "cohort", cohortId, { course_id: courseId, user_id: userId });
    toast.success("Access revoked");
    load();
  };

  if (!courseId) {
    return <Card className="p-6 text-sm text-muted-foreground text-center">Link a course to this cohort to manage access.</Card>;
  }

  const missing = rows.filter((r) => !r.hasAccess);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          disabled={!missing.length || !!busy}
          onClick={async () => { setBusy("all"); await grant(missing.map((m) => m.user_id)); setBusy(null); }}
        >
          <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
          Grant course to all members {missing.length ? `(${missing.length} missing)` : ""}
        </Button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="border rounded-lg divide-y">
        {rows.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No members yet.</div>}
        {rows.map((r) => (
          <div key={r.user_id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="text-sm truncate">{r.full_name ?? r.user_id}</div>
              {r.source && <div className="text-[11px] text-muted-foreground">{r.source}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {r.hasAccess ? (
                <>
                  <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-600">Has access</Badge>
                  <Button size="sm" variant="ghost" onClick={() => revoke(r.user_id)}>
                    <ShieldOff className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => grant([r.user_id])}>Grant</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}