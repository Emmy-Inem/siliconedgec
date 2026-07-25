import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileCheck2, Upload, CalendarClock, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Assignment { id: string; title: string; instructions: string; max_points: number; due_at: string | null }
interface Submission { id: string; content: string; file_url: string | null; submitted_at: string; grade: number | null; feedback: string | null }

export function AssignmentPanel({ lessonId, onSubmitted }: { lessonId: string; onSubmitted?: () => void }) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subs, setSubs] = useState<Record<string, Submission | undefined>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId || !user) return;
    (async () => {
      // Only show assignments the instructor has explicitly published.
      // AI drafts stay hidden until they toggle visibility on.
      const { data: as, error: assignmentError } = await supabase
        .from("assignments")
        .select("id, title, instructions, max_points, due_at")
        .eq("lesson_id", lessonId)
        .eq("is_visible", true);
      if (assignmentError) {
        toast({ title: "Couldn't load assignments", description: assignmentError.message, variant: "destructive" });
        setAssignments([]);
        setSubs({});
        return;
      }
      const list = (as ?? []) as Assignment[];
      setAssignments(list);
      if (list.length) {
        const { data: ss, error: submissionsError } = await supabase.from("assignment_submissions").select("id, assignment_id, content, file_url, submitted_at, grade, feedback").in("assignment_id", list.map((a) => a.id)).eq("user_id", user.id);
        if (submissionsError) {
          toast({ title: "Couldn't load submissions", description: submissionsError.message, variant: "destructive" });
          setSubs({});
          return;
        }
        const map: Record<string, Submission> = {};
        for (const s of ss ?? []) map[(s as any).assignment_id] = s as any;
        setSubs(map);
      } else {
        setSubs({});
      }
    })();
  }, [lessonId, user]);

  if (!user || assignments.length === 0) return null;

  const submit = async (a: Assignment) => {
    const content = drafts[a.id] ?? subs[a.id]?.content ?? "";
    if (!content.trim()) return toast({ title: "Empty submission", description: "Add some content before submitting." });
    setSaving(a.id);
    const existing = subs[a.id];
    let res;
    if (existing) {
      res = await supabase.from("assignment_submissions").update({ content, submitted_at: new Date().toISOString() }).eq("id", existing.id).select().maybeSingle();
    } else {
      res = await supabase.from("assignment_submissions").insert({ assignment_id: a.id, user_id: user.id, content }).select().maybeSingle();
    }
    setSaving(null);
    if (res.error) toast({ title: "Couldn't save", description: res.error.message, variant: "destructive" });
    else { setSubs((p) => ({ ...p, [a.id]: res.data as any })); toast({ title: "Submitted", description: "Your work was sent for review." }); onSubmitted?.(); }
  };

  const upload = async (a: Assignment, file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) return toast({ title: "Too large", description: "Max 10MB", variant: "destructive" });
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    // RLS on assignment-submissions requires the object key to start with the
    // uploader's own auth uid (storage.foldername(name)[1] = auth.uid()::text).
    // Path is unique per timestamp so upsert isn't needed — omitting it also
    // avoids the UPDATE-policy branch that would otherwise be required.
    const path = `${user.id}/${a.id}-${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from("assignment-submissions")
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) return toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    const file_url = path;
    const existing = subs[a.id];
    const saveResult = existing
      ? await supabase.from("assignment_submissions").update({ file_url }).eq("id", existing.id)
      : await supabase.from("assignment_submissions").insert({ assignment_id: a.id, user_id: user.id, content: drafts[a.id] ?? "", file_url });
    if (saveResult.error) return toast({ title: "Couldn't attach file", description: saveResult.error.message, variant: "destructive" });
    toast({ title: "File attached" });
    const { data: s } = await supabase.from("assignment_submissions").select("*").eq("assignment_id", a.id).eq("user_id", user.id).maybeSingle();
    if (s) setSubs((p) => ({ ...p, [a.id]: s as any }));
    onSubmitted?.();
  };

  return (
    <div className="space-y-3">
      {assignments.map((a) => {
        const sub = subs[a.id];
        const isGraded = sub?.grade != null;
        const isSubmitted = !!sub && !isGraded;
        const now = Date.now();
        const due = a.due_at ? new Date(a.due_at).getTime() : null;
        const overdue = !!due && !sub && due < now;
        const status = isGraded ? "Graded" : isSubmitted ? "Submitted" : overdue ? "Overdue" : "To do";
        return (
          <div key={a.id} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2" aria-label={`Assignment ${a.title}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary" />{a.title}</p>
              {isGraded ? (
                <Badge>{sub.grade}/{a.max_points}</Badge>
              ) : isSubmitted ? (
                <Badge variant="secondary">Submitted</Badge>
              ) : overdue ? (
                <Badge variant="destructive">Overdue</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
            {/* Workflow status timeline */}
            <ol className="flex items-center gap-1.5 text-[10px] text-muted-foreground" aria-label="Submission status">
              {(["To do", "Submitted", "Graded"] as const).map((s, i) => {
                const reached =
                  (s === "To do") ||
                  (s === "Submitted" && (isSubmitted || isGraded)) ||
                  (s === "Graded" && isGraded);
                return (
                  <li key={s} className="flex items-center gap-1.5">
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${reached ? "border-primary bg-primary text-primary-foreground" : "border-border"}`} aria-hidden>
                      {reached ? <CheckCircle2 className="h-2.5 w-2.5" /> : null}
                    </span>
                    <span className={reached ? "text-foreground font-medium" : ""}>{s}</span>
                    {i < 2 && <span className="w-3 h-px bg-border" aria-hidden />}
                  </li>
                );
              })}
              <li className="ml-auto sr-only">Current status: {status}</li>
            </ol>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.instructions}</p>
            {a.due_at && (
              <p className={`text-[11px] flex items-center gap-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                <CalendarClock className="h-3 w-3" aria-hidden /> Due: {new Date(a.due_at).toLocaleString()}
              </p>
            )}
            <Textarea
              rows={4}
              placeholder="Type your response…"
              defaultValue={sub?.content ?? ""}
              onChange={(e) => setDrafts((p) => ({ ...p, [a.id]: e.target.value }))}
              disabled={isGraded}
              aria-label={`Response for ${a.title}`}
            />
            {sub?.file_url && <p className="text-[11px] text-muted-foreground">📎 File attached</p>}
            {sub?.feedback && <div className="text-sm bg-muted/40 rounded p-2"><span className="font-semibold">Instructor feedback:</span> {sub.feedback}</div>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => submit(a)} disabled={saving === a.id || isGraded} aria-label={sub ? `Update submission for ${a.title}` : `Submit ${a.title}`}>
                {saving === a.id ? <Loader2 className="h-3 w-3 animate-spin" aria-label="Saving" /> : sub ? "Update submission" : "Submit"}
              </Button>
              <label className="inline-flex items-center gap-1 text-xs cursor-pointer rounded-md border border-border px-2 py-1 hover:bg-muted">
                <Upload className="h-3 w-3" aria-hidden /> Attach file
                <input type="file" hidden onChange={(e) => e.target.files?.[0] && upload(a, e.target.files[0])} disabled={isGraded} aria-label={`Attach a file to ${a.title}`} />
              </label>
              {isGraded && (
                <span className="text-[11px] text-muted-foreground self-center">Locked after grading.</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}