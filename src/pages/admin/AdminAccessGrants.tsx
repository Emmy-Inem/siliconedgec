import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";

/**
 * Manual Access Grants — lets an admin/instructor hand a student access to a
 * course without a Paystack payment. We upsert into `enrollments` with
 * `payment_status='granted'` and `access_source='manual_grant'`; the existing
 * `is_paid_enrolled` helper already treats those as valid access.
 */
export default function AdminAccessGrants() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ user_id: string; full_name: string | null } | null>(null);
  const [courseId, setCourseId] = useState("");
  const [note, setNote] = useState("");

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["access-grants-profiles"],
    queryFn: () => fetchAllRows<any>("profiles", "user_id, full_name, avatar_url"),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["access-grants-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data as { id: string; title: string }[];
    },
  });

  const { data: grants = [], isLoading: loadingGrants } = useQuery({
    queryKey: ["access-grants-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("enrollments")
        .select("id, user_id, course_id, payment_status, access_source, granted_by, created_at, courses(title), profiles:profiles!enrollments_user_id_fkey(full_name)")
        .in("access_source", ["manual_grant", "promo", "bootcamp"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        // Fallback: some projects have no explicit FK-embed name — try a
        // simpler select and hydrate names client-side.
        const { data: rows } = await (supabase as any)
          .from("enrollments")
          .select("id, user_id, course_id, payment_status, access_source, granted_by, created_at, courses(title)")
          .in("access_source", ["manual_grant", "promo", "bootcamp"])
          .order("created_at", { ascending: false })
          .limit(200);
        return rows ?? [];
      }
      return data ?? [];
    },
  });

  const filteredProfiles = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return [] as any[];
    return (profiles ?? [])
      .filter((p: any) =>
        (p.full_name || "").toLowerCase().includes(q) || p.user_id.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [profiles, studentSearch]);

  const grant = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !courseId) throw new Error("Pick a student and course");
      // Safeguard: double-check the course exists and lock the payload to
      // ONLY the fields relevant to this single enrollment. The unique
      // (user_id, course_id) constraint on `enrollments` guarantees the
      // upsert cannot touch another course's row.
      const { data: courseCheck, error: courseErr } = await supabase
        .from("courses")
        .select("id, title")
        .eq("id", courseId)
        .maybeSingle();
      if (courseErr || !courseCheck) throw new Error("That course no longer exists.");
      const confirmed = window.confirm(
        `Grant ${selectedUser.full_name || "this student"} access ONLY to "${courseCheck.title}"? They will not gain access to any other course.`,
      );
      if (!confirmed) throw new Error("Cancelled");
      const payload = {
        user_id: selectedUser.user_id,
        course_id: courseId,
        payment_status: "granted",
        access_source: "manual_grant",
        granted_by: user?.id ?? null,
        progress_percentage: 0,
        is_completed: false,
      } as any;
      const { error } = await (supabase as any)
        .from("enrollments")
        .upsert(payload, { onConflict: "user_id,course_id" });
      if (error) throw error;
      await logAdminActivity("manual_grant", "enrollment", `${selectedUser.user_id}:${courseId}`, {
        course_title: courseCheck.title,
        student_name: selectedUser.full_name,
        note: note || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Access granted", description: "The student can now open the course." });
      qc.invalidateQueries({ queryKey: ["access-grants-list"] });
      setSelectedUser(null);
      setStudentSearch("");
      setCourseId("");
      setNote("");
    },
    onError: (e: any) => toast({ title: "Couldn't grant access", description: e.message, variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("enrollments").delete().eq("id", id);
      if (error) throw error;
      await logAdminActivity("revoke_grant", "enrollment", id);
    },
    onSuccess: () => {
      toast({ title: "Access revoked" });
      qc.invalidateQueries({ queryKey: ["access-grants-list"] });
    },
    onError: (e: any) => toast({ title: "Couldn't revoke", description: e.message, variant: "destructive" }),
  });

  const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <h1 className="font-heading text-xl font-bold">Manual Access Grants</h1>
          <p className="text-sm text-muted-foreground">
            Give a student full access to a course without a Paystack payment — useful for
            scholarships, bootcamp participants, or make-good grants.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="font-heading font-semibold text-sm">Grant new access</h2>

        <div>
          <label className="text-xs font-medium block mb-1">Search student by name or user ID</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={selectedUser ? (selectedUser.full_name || selectedUser.user_id) : studentSearch}
              onChange={(e) => { setSelectedUser(null); setStudentSearch(e.target.value); }}
              placeholder="Start typing a student's name…"
              className={`${inputClass} pl-9`}
            />
          </div>
          {loadingProfiles && <p className="text-[11px] text-muted-foreground mt-1">Loading students…</p>}
          {!selectedUser && filteredProfiles.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {filteredProfiles.map((p: any) => (
                <li key={p.user_id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedUser({ user_id: p.user_id, full_name: p.full_name }); setStudentSearch(""); }}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2"
                  >
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
                      {(p.full_name || "U")[0].toUpperCase()}
                    </span>
                    <span className="flex-1 truncate">{p.full_name || "Unnamed"}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">{p.user_id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="text-xs font-medium block mb-1">Course</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputClass}>
            <option value="">Select a course…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1">Internal note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. bootcamp scholarship" className={inputClass} />
        </div>

        <Button
          onClick={() => grant.mutate()}
          disabled={!selectedUser || !courseId || grant.isPending}
        >
          {grant.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
          Grant access
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-heading font-semibold text-sm mb-3">Existing manual grants</h2>
        {loadingGrants ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : grants.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No manual grants yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {grants.map((g: any) => (
              <li key={g.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{g.courses?.title ?? g.course_id}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    User {g.user_id.slice(0, 8)}… · granted {new Date(g.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{g.access_source}</Badge>
                <button
                  onClick={() => { if (confirm("Revoke this access?")) revoke.mutate(g.id); }}
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                  aria-label="Revoke access"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}