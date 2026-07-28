import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff, Plus, Sparkles, Trash2 } from "lucide-react";

const db = supabase as any;

type Kind = "assignments" | "quizzes";

/**
 * Create / publish / hide assignments and quizzes for the cohort's linked
 * course without leaving the Cohorts workspace. Manual items are visible by
 * default; AI-generated ones stay hidden until staff publish them.
 */
export function CohortAssessmentsPanel({ courseId, kind }: { courseId: string | null; kind: Kind }) {
  const [lessons, setLessons] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", lesson_id: "", instructions: "", max_points: "100", passing_score: "70" });
  const [questions, setQuestions] = useState<{ q: string; opts: string[]; correct: number }[]>([
    { q: "", opts: ["", "", "", ""], correct: 0 },
  ]);

  const loadLessons = async () => {
    if (!courseId) return;
    const { data } = await supabase.rpc("get_course_curriculum", { p_course_id: courseId });
    setLessons((data ?? []).filter((r: any) => r.lesson_id));
  };

  const loadRows = async () => {
    if (!courseId) return;
    const { data } = await supabase.rpc("get_course_curriculum", { p_course_id: courseId });
    const ids = (data ?? []).filter((r: any) => r.lesson_id).map((r: any) => r.lesson_id);
    if (!ids.length) return setRows([]);
    const { data: items } = await db.from(kind).select("*").in("lesson_id", ids).order("created_at", { ascending: false });
    setRows(items ?? []);
  };

  useEffect(() => { loadLessons(); loadRows(); }, [courseId, kind]);

  const lessonTitle = (id: string) => lessons.find((l) => l.lesson_id === id)?.lesson_title ?? "—";

  const toggleVisible = async (row: any) => {
    const { error } = await db.from(kind).update({ is_visible: !row.is_visible }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(!row.is_visible ? "Published to students" : "Hidden from students");
    loadRows();
  };

  const remove = async (row: any) => {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const { error } = await db.from(kind).delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadRows();
  };

  const resetForm = () => {
    setForm({ title: "", lesson_id: "", instructions: "", max_points: "100", passing_score: "70" });
    setQuestions([{ q: "", opts: ["", "", "", ""], correct: 0 }]);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.lesson_id) return toast.error("Attach this to a lesson");
    setSaving(true);
    try {
      if (kind === "assignments") {
        const { error } = await db.from("assignments").insert({
          title: form.title.trim(),
          lesson_id: form.lesson_id,
          instructions: form.instructions || null,
          max_points: Number(form.max_points) || 100,
          is_ai_generated: false,
          is_visible: true,
        });
        if (error) throw error;
      } else {
        const valid = questions.filter((q) => q.q.trim() && q.opts.filter((o) => o.trim()).length >= 2);
        if (!valid.length) throw new Error("Add at least one question with two options");
        const { data: quiz, error } = await db.from("quizzes").insert({
          title: form.title.trim(),
          lesson_id: form.lesson_id,
          description: form.instructions || null,
          passing_score: Number(form.passing_score) || 70,
          is_ai_generated: false,
          is_visible: true,
        }).select().single();
        if (error) throw error;
        const rowsToInsert = valid.map((q, i) => ({
          quiz_id: quiz.id,
          question_text: q.q.trim(),
          options: q.opts.filter((o) => o.trim()),
          correct_answer: q.opts[q.correct]?.trim() ?? q.opts.filter((o) => o.trim())[0],
          order_index: i,
        }));
        const { error: qErr } = await db.from("quiz_questions").insert(rowsToInsert);
        if (qErr) throw qErr;
      }
      toast.success(kind === "assignments" ? "Assignment created" : "Quiz created");
      setOpen(false);
      resetForm();
      loadRows();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!courseId) {
    return <Card className="p-6 text-sm text-muted-foreground text-center">Link a course to this cohort to manage {kind}.</Card>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {rows.length} {kind === "assignments" ? "assignment" : "quiz"}
          {rows.length === 1 ? "" : kind === "assignments" ? "s" : "zes"} on this course
        </p>
        <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />New {kind === "assignments" ? "assignment" : "quiz"}
        </Button>
      </div>

      <div className="border rounded-lg divide-y">
        {rows.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">Nothing here yet.</div>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate flex items-center gap-1.5">
                {r.title}
                {r.is_ai_generated && <Badge variant="secondary" className="text-[10px] gap-1"><Sparkles className="h-3 w-3" />AI</Badge>}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{lessonTitle(r.lesson_id)}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`text-[10px] ${r.is_visible ? "border-green-500/50 text-green-600" : "text-muted-foreground"}`}>
                {r.is_visible ? "Published" : "Hidden"}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => toggleVisible(r)}>
                {r.is_visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New {kind === "assignments" ? "assignment" : "quiz"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Attach to lesson</Label>
              <Select value={form.lesson_id} onValueChange={(v) => setForm({ ...form, lesson_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select lesson…" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {lessons.map((l) => (
                    <SelectItem key={l.lesson_id} value={l.lesson_id}>{l.module_title} · {l.lesson_title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{kind === "assignments" ? "Instructions" : "Description"}</Label>
              <Textarea rows={3} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
            </div>
            {kind === "assignments" ? (
              <div>
                <Label>Max points</Label>
                <Input type="number" value={form.max_points} onChange={(e) => setForm({ ...form, max_points: e.target.value })} />
              </div>
            ) : (
              <>
                <div>
                  <Label>Passing score (%)</Label>
                  <Input type="number" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <Label>Questions</Label>
                  {questions.map((q, qi) => (
                    <Card key={qi} className="p-3 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder={`Question ${qi + 1}`}
                          value={q.q}
                          onChange={(e) => setQuestions(questions.map((x, i) => (i === qi ? { ...x, q: e.target.value } : x)))}
                        />
                        {questions.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {q.opts.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qi}`}
                              checked={q.correct === oi}
                              onChange={() => setQuestions(questions.map((x, i) => (i === qi ? { ...x, correct: oi } : x)))}
                            />
                            <Input
                              placeholder={`Option ${oi + 1}`}
                              value={o}
                              onChange={(e) =>
                                setQuestions(questions.map((x, i) =>
                                  i === qi ? { ...x, opts: x.opts.map((y, j) => (j === oi ? e.target.value : y)) } : x,
                                ))
                              }
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Select the radio next to the correct option.</p>
                    </Card>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setQuestions([...questions, { q: "", opts: ["", "", "", ""], correct: 0 }])}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Add question
                  </Button>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}