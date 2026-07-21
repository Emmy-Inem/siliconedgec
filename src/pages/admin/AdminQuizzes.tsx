import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Check, Star } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QuizAIGenerator, AIQuestion } from "@/components/admin/QuizAIGenerator";

interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  passing_score: number;
  is_ai_generated?: boolean;
  is_visible?: boolean;
  lessons?: { title: string; modules?: { courses?: { title: string } } } | null;
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  order_index: number;
}

export default function AdminQuizzes() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [form, setForm] = useState({ title: "", lesson_id: "", passing_score: "70" });
  type ManualQ = { question_text: string; options: string[]; correct_answer: string };
  const [manualQs, setManualQs] = useState<ManualQ[]>([
    { question_text: "", options: ["", "", "", ""], correct_answer: "" },
  ]);
  const [questionsDialogOpen, setQuestionsDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [qForm, setQForm] = useState({ question_text: "", options: ["", "", "", ""], correct_answer: "" });

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["admin-quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*, lessons(title, modules(courses(title)))").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Quiz[];
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["admin-all-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("id, title, modules(courses(title))").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["admin-quiz-questions", selectedQuiz?.id],
    queryFn: async () => {
      if (!selectedQuiz) return [];
      const { data, error } = await supabase.from("quiz_questions").select("*").eq("quiz_id", selectedQuiz.id).order("order_index");
      if (error) throw error;
      return data as QuizQuestion[];
    },
    enabled: !!selectedQuiz,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { title: form.title, lesson_id: form.lesson_id, passing_score: parseInt(form.passing_score) };
      if (editing) {
        const { error } = await supabase.from("quizzes").update(payload).eq("id", editing.id);
        if (error) throw error;
        return;
      } else {
        const { data, error } = await supabase
          .from("quizzes")
          .insert({ ...payload, is_ai_generated: false, is_visible: true } as any)
          .select("id")
          .single();
        if (error) throw error;
        const valid = manualQs
          .map((q) => ({
            ...q,
            options: q.options.map((o) => o.trim()).filter(Boolean),
          }))
          .filter((q) => q.question_text.trim() && q.options.length >= 2 && q.correct_answer && q.options.includes(q.correct_answer));
        if (valid.length > 0 && data?.id) {
          const rows = valid.map((q, i) => ({
            quiz_id: data.id,
            question_text: q.question_text.trim(),
            options: q.options,
            correct_answer: q.correct_answer,
            order_index: i,
          }));
          const { error: qErr } = await supabase.from("quiz_questions").insert(rows);
          if (qErr) throw qErr;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-quizzes"] });
      setDialogOpen(false);
      toast({ title: editing ? "Quiz updated" : "Quiz created with questions" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveQuizWithAI = useMutation({
    mutationFn: async (questions: AIQuestion[]) => {
      if (!form.title || !form.lesson_id) throw new Error("Provide a quiz title and lesson before saving AI questions");
      const { data: quiz, error } = await supabase
        .from("quizzes")
        .insert({
          title: form.title,
          lesson_id: form.lesson_id,
          passing_score: parseInt(form.passing_score),
          is_ai_generated: true,
          is_visible: false,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      const rows = questions
        .filter((q) => q.question && q.options.length === 4 && q.correct_answer)
        .map((q, i) => ({
          quiz_id: quiz.id,
          question_text: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          order_index: i,
        }));
      if (rows.length > 0) {
        const { error: qErr } = await supabase.from("quiz_questions").insert(rows);
        if (qErr) throw qErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-quizzes"] });
      setDialogOpen(false);
      toast({ title: "AI quiz saved with questions" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("quizzes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-quizzes"] }); toast({ title: "Quiz deleted" }); },
  });

  const toggleVisible = useMutation({
    mutationFn: async (q: Quiz) => {
      const { error } = await (supabase as any)
        .from("quizzes")
        .update({ is_visible: !q.is_visible })
        .eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: (_d, q) => {
      qc.invalidateQueries({ queryKey: ["admin-quizzes"] });
      toast({ title: q.is_visible ? "Quiz hidden from students" : "Quiz published to students" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkSetVisible = useMutation({
    mutationFn: async (visible: boolean) => {
      const ids = quizzes.filter((q) => !!q.is_visible !== visible).map((q) => q.id);
      if (ids.length === 0) return 0;
      const { error } = await (supabase as any)
        .from("quizzes")
        .update({ is_visible: visible })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n, visible) => {
      qc.invalidateQueries({ queryKey: ["admin-quizzes"] });
      toast({
        title: n
          ? `${n} quiz${n === 1 ? "" : "zes"} ${visible ? "published" : "hidden"}`
          : "Nothing to update",
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addQuestion = useMutation({
    mutationFn: async () => {
      if (!selectedQuiz) return;
      const opts = qForm.options.filter(Boolean);
      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: selectedQuiz.id, question_text: qForm.question_text, options: opts,
        correct_answer: qForm.correct_answer, order_index: questions.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-quiz-questions", selectedQuiz?.id] });
      setQForm({ question_text: "", options: ["", "", "", ""], correct_answer: "" });
      toast({ title: "Question added" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeQuestion = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("quiz_questions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-quiz-questions", selectedQuiz?.id] }); toast({ title: "Question deleted" }); },
  });

  const columns: Column<Quiz>[] = [
    { key: "title", label: "Quiz Title" },
    { key: "lesson_id", label: "Lesson", render: (q) => <span className="text-xs">{(q.lessons as any)?.title || "—"}</span> },
    { key: "passing_score", label: "Passing Score", render: (q) => <Badge variant="secondary">{q.passing_score}%</Badge> },
    {
      key: "is_visible",
      label: "Status",
      render: (q) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={q.is_visible ? "default" : "outline"} className="text-[10px]">
            {q.is_visible ? "Published" : "Hidden"}
          </Badge>
          {q.is_ai_generated && (
            <Badge variant="secondary" className="text-[10px]">
              <Star className="h-2.5 w-2.5 mr-0.5" /> AI
            </Badge>
          )}
        </div>
      ),
    },
  ];

  const openAdd = () => {
    setEditing(null);
    setForm({ title: "", lesson_id: "", passing_score: "70" });
    setManualQs([{ question_text: "", options: ["", "", "", ""], correct_answer: "" }]);
    setDialogOpen(true);
  };
  const openEdit = (q: Quiz) => {
    setEditing(q);
    setForm({ title: q.title, lesson_id: q.lesson_id, passing_score: String(q.passing_score) });
    setDialogOpen(true);
  };
  const updateMQ = (idx: number, patch: Partial<ManualQ>) => {
    setManualQs((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };
  const updateMQOpt = (qIdx: number, optIdx: number, value: string) => {
    setManualQs((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      // If the correct answer no longer matches any option, clear it.
      const stillValid = q.correct_answer && opts.includes(q.correct_answer);
      return { ...q, options: opts, correct_answer: stillValid ? q.correct_answer : "" };
    }));
  };
  const addMQ = () => setManualQs((prev) => [...prev, { question_text: "", options: ["", "", "", ""], correct_answer: "" }]);
  const removeMQ = (idx: number) => setManualQs((prev) => prev.filter((_, i) => i !== idx));
  const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2 mb-3">
        <span className="text-xs text-muted-foreground mr-auto">{quizzes.length} quiz{quizzes.length === 1 ? "" : "zes"}</span>
        <Button
          size="sm"
          variant="outline"
          disabled={bulkSetVisible.isPending || quizzes.length === 0}
          onClick={() => {
            if (confirm(`Publish all ${quizzes.length} quizzes to students?`)) bulkSetVisible.mutate(true);
          }}
        >
          Publish all
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={bulkSetVisible.isPending || quizzes.length === 0}
          onClick={() => {
            if (confirm(`Hide all ${quizzes.length} quizzes from students?`)) bulkSetVisible.mutate(false);
          }}
        >
          Hide all
        </Button>
      </div>
      <AdminCrudTable
        title="Quizzes"
        data={quizzes}
        columns={columns}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(id) => remove.mutate(id)}
        isLoading={isLoading}
        addLabel="Add Quiz"
        extraActions={(item) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleVisible.mutate(item)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
              title={item.is_visible ? "Hide from students" : "Publish to students"}
            >
              {item.is_visible ? "Unpublish" : "Publish"}
            </button>
            <button onClick={() => { setSelectedQuiz(item); setQuestionsDialogOpen(true); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-medium">
              Q&A
            </button>
          </div>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Quiz" : "Add Quiz"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Lesson</label>
              <select value={form.lesson_id} onChange={(e) => setForm({ ...form, lesson_id: e.target.value })} required className={inputClass}>
                <option value="">Select lesson...</option>
                {lessons.map((l: any) => <option key={l.id} value={l.id}>{l.modules?.courses?.title ? `${l.modules.courses.title} → ` : ""}{l.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Passing Score (%)</label>
              <input type="number" min="0" max="100" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: e.target.value })} className={inputClass} />
            </div>

            {editing ? (
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="manual" className="pt-2 border-t border-border">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                  <TabsTrigger value="ai">
                    <Star className="h-3.5 w-3.5 mr-1" /> Generate with AI
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="manual" className="space-y-3 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Add each question and its four options below. Select the correct answer for each.
                  </p>
                  <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                    {manualQs.map((q, qi) => (
                      <div key={qi} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-semibold text-muted-foreground">Question {qi + 1}</div>
                          {manualQs.length > 1 && (
                            <button type="button" onClick={() => removeMQ(qi)} className="text-destructive text-xs hover:underline">
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          value={q.question_text}
                          onChange={(e) => updateMQ(qi, { question_text: e.target.value })}
                          placeholder="Type the question…"
                          className={inputClass}
                        />
                        <div className="space-y-1.5">
                          {q.options.map((opt, oi) => (
                            <label key={oi} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${qi}`}
                                checked={!!opt && q.correct_answer === opt}
                                onChange={() => updateMQ(qi, { correct_answer: opt })}
                                disabled={!opt}
                                className="shrink-0"
                              />
                              <input
                                value={opt}
                                onChange={(e) => updateMQOpt(qi, oi, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                className={inputClass}
                              />
                            </label>
                          ))}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Tick the radio next to the correct option.
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addMQ} className="w-full">
                    <Plus className="h-3 w-3 mr-1" /> Add another question
                  </Button>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
                      {save.isPending ? "Saving..." : "Save Quiz"}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="ai" className="pt-3">
                  <QuizAIGenerator
                    defaultTopic={form.title}
                    onAccept={(qs) => saveQuizWithAI.mutate(qs)}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={questionsDialogOpen} onOpenChange={setQuestionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Questions for "{selectedQuiz?.title}"</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-start">
                  <p className="font-medium">{i + 1}. {q.question_text}</p>
                  <button onClick={() => removeQuestion.mutate(q.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="mt-2 space-y-1">
                  {(q.options as string[]).map((opt, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs">
                      {opt === q.correct_answer ? <Check className="h-3 w-3 text-green-500" /> : <span className="w-3" />}
                      <span className={opt === q.correct_answer ? "text-green-600 font-medium" : ""}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-3">Add Question</p>
              <div className="space-y-3">
                <input value={qForm.question_text} onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })} placeholder="Question text" className={inputClass} />
                {qForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={qForm.correct_answer === opt && opt !== ""} onChange={() => setQForm({ ...qForm, correct_answer: opt })} />
                    <input value={opt} onChange={(e) => { const opts = [...qForm.options]; opts[i] = e.target.value; setQForm({ ...qForm, options: opts }); }} placeholder={`Option ${i + 1}`} className={inputClass} />
                  </div>
                ))}
                <Button size="sm" onClick={() => addQuestion.mutate()} disabled={!qForm.question_text || !qForm.correct_answer || addQuestion.isPending}>
                  <Plus className="h-3 w-3 mr-1" /> Add Question
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
