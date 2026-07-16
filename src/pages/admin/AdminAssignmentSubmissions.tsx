import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Download, CheckCircle2, FileCheck2, Loader2, GraduationCap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const openAssignmentFile = async (fileUrl: string) => {
  if (/^https?:\/\//i.test(fileUrl)) {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const { data, error } = await supabase.storage
    .from("assignment-submissions")
    .createSignedUrl(fileUrl, 60 * 60);
  if (error || !data?.signedUrl) {
    toast({ title: "Couldn't open file", description: error?.message ?? "Signed URL failed", variant: "destructive" });
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
};

interface SubmissionRow {
  id: string;
  assignment_id: string;
  user_id: string;
  content: string;
  file_url: string | null;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  graded_at: string | null;
  assignment?: { id: string; title: string; max_points: number; instructions: string };
  student_name?: string;
  student_email?: string;
}

type Filter = "all" | "pending" | "graded";

export default function AdminAssignmentSubmissions() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");
  const [active, setActive] = useState<SubmissionRow | null>(null);
  const [gradeInput, setGradeInput] = useState<string>("");
  const [feedbackInput, setFeedbackInput] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assignment_submissions")
      .select("id, assignment_id, user_id, content, file_url, submitted_at, grade, feedback, graded_at, assignment:assignments(id, title, max_points, instructions)")
      .order("submitted_at", { ascending: false });
    if (error) {
      toast({ title: "Couldn't load submissions", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const list = (data ?? []) as any[];
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: profiles } = await supabase.rpc("get_public_profiles", { p_user_ids: userIds });
      const map = new Map<string, any>();
      for (const p of (profiles ?? []) as any[]) map.set(p.user_id, p);
      for (const r of list) {
        const p = map.get(r.user_id);
        r.student_name = p?.full_name ?? "Student";
      }
    }
    setRows(list as SubmissionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const pass =
        filter === "all" ||
        (filter === "graded" && r.grade != null) ||
        (filter === "pending" && r.grade == null);
      if (!pass) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (r.student_name ?? "").toLowerCase().includes(q) ||
        (r.assignment?.title ?? "").toLowerCase().includes(q) ||
        (r.content ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  const openGrader = (row: SubmissionRow) => {
    setActive(row);
    setGradeInput(row.grade != null ? String(row.grade) : "");
    setFeedbackInput(row.feedback ?? "");
  };

  const submit = async () => {
    if (!active) return;
    const max = active.assignment?.max_points ?? 100;
    const grade = Number(gradeInput);
    if (!Number.isFinite(grade) || grade < 0 || grade > max) {
      toast({ title: `Grade must be 0–${max}`, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user: me } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("assignment_submissions")
      .update({
        grade,
        feedback: feedbackInput.trim() || null,
        graded_at: new Date().toISOString(),
        graded_by: me?.id ?? null,
      })
      .eq("id", active.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save grade", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Graded", description: "Student notified automatically." });
    setActive(null);
    await load();
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const graded = rows.filter((r) => r.grade != null).length;
    return { total, graded, pending: total - graded };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <FileCheck2 className="h-6 w-6 text-primary" />
          Assignment Submissions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Grade student work and leave rubric feedback. Students are notified automatically.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pending</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-500">{stats.pending}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Graded</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-500">{stats.graded}</p></CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, assignment, content…" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="graded">Graded</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl">
          <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No submissions match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-semibold">{r.assignment?.title ?? "Assignment"}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.student_name} · Submitted {format(new Date(r.submitted_at), "PP p")}
                  </p>
                </div>
                {r.grade != null ? (
                  <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> {r.grade}/{r.assignment?.max_points ?? 100}</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
                {r.file_url && (
                  <button type="button" onClick={() => openAssignmentFile(r.file_url!)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Download className="h-3 w-3" /> File
                  </button>
                )}
                <Button size="sm" onClick={() => openGrader(r)}>{r.grade != null ? "Re-grade" : "Grade"}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Grade submission</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Assignment</p>
                <p className="font-semibold">{active.assignment?.title}</p>
                {active.assignment?.instructions && (
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{active.assignment.instructions}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Student response</p>
                <div className="rounded border border-border p-3 bg-muted/30 max-h-64 overflow-y-auto text-sm whitespace-pre-wrap">
                  {active.content || <span className="italic text-muted-foreground">No written response.</span>}
                </div>
                {active.file_url && (
                  <button type="button" onClick={() => openAssignmentFile(active.file_url!)} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Download className="h-3 w-3" /> Download attachment
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Score (0–{active.assignment?.max_points ?? 100})</label>
                  <Input
                    type="number"
                    min={0}
                    max={active.assignment?.max_points ?? 100}
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-muted-foreground">
                    {gradeInput && Number(gradeInput) >= (active.assignment?.max_points ?? 100) * 0.6
                      ? "✓ Pass"
                      : gradeInput
                        ? "Below 60% — fail"
                        : ""}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Feedback (rubric notes, strengths, improvements)</label>
                <Textarea rows={4} value={feedbackInput} onChange={(e) => setFeedbackInput(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save grade"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}