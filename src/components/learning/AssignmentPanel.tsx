import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileCheck2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Assignment { id: string; title: string; instructions: string; max_points: number; due_at: string | null }
interface Submission { id: string; content: string; file_url: string | null; submitted_at: string; grade: number | null; feedback: string | null }

export function AssignmentPanel({ lessonId }: { lessonId: string }) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subs, setSubs] = useState<Record<string, Submission | undefined>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId || !user) return;
    (async () => {
      const { data: as } = await supabase.from("assignments").select("id, title, instructions, max_points, due_at").eq("lesson_id", lessonId);
      const list = (as ?? []) as Assignment[];
      setAssignments(list);
      if (list.length) {
        const { data: ss } = await supabase.from("assignment_submissions").select("id, assignment_id, content, file_url, submitted_at, grade, feedback").in("assignment_id", list.map((a) => a.id)).eq("user_id", user.id);
        const map: Record<string, Submission> = {};
        for (const s of ss ?? []) map[(s as any).assignment_id] = s as any;
        setSubs(map);
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
    else { setSubs((p) => ({ ...p, [a.id]: res.data as any })); toast({ title: "Submitted", description: "Your work was sent for review." }); }
  };

  const upload = async (a: Assignment, file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) return toast({ title: "Too large", description: "Max 10MB", variant: "destructive" });
    const path = `${user.id}/${a.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("course-resources").upload(path, file, { upsert: true });
    if (error) return toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    const { data: pub } = supabase.storage.from("course-resources").createSignedUrl ? await supabase.storage.from("course-resources").createSignedUrl(path, 60 * 60 * 24 * 365) : { data: null } as any;
    const file_url = pub?.signedUrl ?? path;
    const existing = subs[a.id];
    if (existing) await supabase.from("assignment_submissions").update({ file_url }).eq("id", existing.id);
    else await supabase.from("assignment_submissions").insert({ assignment_id: a.id, user_id: user.id, content: drafts[a.id] ?? "", file_url });
    toast({ title: "File attached" });
    const { data: s } = await supabase.from("assignment_submissions").select("*").eq("assignment_id", a.id).eq("user_id", user.id).maybeSingle();
    if (s) setSubs((p) => ({ ...p, [a.id]: s as any }));
  };

  return (
    <div className="space-y-3">
      {assignments.map((a) => {
        const sub = subs[a.id];
        return (
          <div key={a.id} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary" />{a.title}</p>
              {sub?.grade != null ? (
                <Badge>{sub.grade}/{a.max_points}</Badge>
              ) : sub ? (
                <Badge variant="secondary">Submitted</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.instructions}</p>
            {a.due_at && <p className="text-[11px] text-muted-foreground">Due: {new Date(a.due_at).toLocaleString()}</p>}
            <Textarea rows={4} placeholder="Type your response…" defaultValue={sub?.content ?? ""} onChange={(e) => setDrafts((p) => ({ ...p, [a.id]: e.target.value }))} disabled={sub?.grade != null} />
            {sub?.file_url && <p className="text-[11px] text-muted-foreground">📎 File attached</p>}
            {sub?.feedback && <div className="text-sm bg-muted/40 rounded p-2"><span className="font-semibold">Instructor feedback:</span> {sub.feedback}</div>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => submit(a)} disabled={saving === a.id || sub?.grade != null}>{saving === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : sub ? "Update submission" : "Submit"}</Button>
              <label className="inline-flex items-center gap-1 text-xs cursor-pointer rounded-md border border-border px-2 py-1 hover:bg-muted">
                <Upload className="h-3 w-3" /> Attach file
                <input type="file" hidden onChange={(e) => e.target.files?.[0] && upload(a, e.target.files[0])} disabled={sub?.grade != null} />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}