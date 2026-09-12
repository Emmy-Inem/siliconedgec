import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

export interface LessonRef {
  id: string;
  title: string;
}

const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export function QuizQuestionsDialog({ lesson, onClose }: { lesson: LessonRef; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: quizzes = [] } = useQuery({
    queryKey: ["cb-quiz-for-lesson", lesson.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .select("id, title, passing_score, is_visible, is_ai_generated")
        .eq("lesson_id", lesson.id)
        .order("created_at");
      if (error) throw error;
      return data as Array<{
        id: string;
        title: string;
        passing_score: number;
        is_visible: boolean | null;
        is_ai_generated: boolean | null;
      }>;
    },
  });

  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const currentQuizId = activeQuizId ?? quizzes[0]?.id ?? null;

  const { data: questions = [] } = useQuery({
    queryKey: ["cb-quiz-questions", currentQuizId],
    queryFn: async () => {
      if (!currentQuizId) return [];
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("id, question_text, options, correct_answer, order_index")
        .eq("quiz_id", currentQuizId)
        .order("order_index");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!currentQuizId,
  });

  const [qForm, setQForm] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
  });

  const addQ = useMutation({
    mutationFn: async () => {
      if (!currentQuizId) throw new Error("No quiz selected");
      const opts = qForm.options.map((o) => o.trim()).filter(Boolean);
      if (!qForm.question_text.trim() || opts.length < 2 || !opts.includes(qForm.correct_answer)) {
        throw new Error("Enter the question, at least 2 options, and pick the correct one.");
      }
      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: currentQuizId,
        question_text: qForm.question_text.trim(),
        options: opts,
        correct_answer: qForm.correct_answer,
        order_index: questions.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cb-quiz-questions", currentQuizId] });
      setQForm({ question_text: "", options: ["", "", "", ""], correct_answer: "" });
      toast({ title: "Question added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeQ = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cb-quiz-questions", currentQuizId] });
      toast({ title: "Question removed" });
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Questions · {lesson.title}</DialogTitle>
        </DialogHeader>
        {quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            No quiz exists on this lesson yet. Close this dialog, open the lesson, and use the Quiz
            form to create one — you can add questions there too.
          </p>
        ) : (
          <div className="space-y-4">
            {quizzes.length > 1 && (
              <select
                value={currentQuizId ?? ""}
                onChange={(e) => setActiveQuizId(e.target.value)}
                className={inputClass}
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} ({q.passing_score}%)
                  </option>
                ))}
              </select>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Existing questions</p>
              {questions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No questions yet.</p>
              ) : (
                questions.map((q: any, i: number) => (
                  <div key={q.id} className="rounded-md border border-border bg-muted/30 p-2.5 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">
                        {i + 1}. {q.question_text}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeQ.mutate(q.id)}
                        className="text-destructive"
                        title="Delete question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <ul className="mt-1.5 space-y-0.5 text-xs">
                      {(q.options as string[]).map((opt, j) => (
                        <li
                          key={j}
                          className={opt === q.correct_answer ? "text-green-600 font-medium" : ""}
                        >
                          {opt === q.correct_answer ? "✓ " : "• "}
                          {opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-lg border border-border bg-background p-3 space-y-2">
              <p className="text-xs font-semibold">Add a question</p>
              <input
                value={qForm.question_text}
                onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })}
                placeholder="Question text"
                className={inputClass}
              />
              <div className="space-y-1.5">
                {qForm.options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="cb-new-q-correct"
                      checked={!!opt && qForm.correct_answer === opt}
                      onChange={() => setQForm({ ...qForm, correct_answer: opt })}
                      disabled={!opt}
                      className="shrink-0"
                    />
                    <input
                      value={opt}
                      onChange={(e) => {
                        const opts = [...qForm.options];
                        opts[oi] = e.target.value;
                        const stillValid =
                          qForm.correct_answer && opts.includes(qForm.correct_answer);
                        setQForm({
                          ...qForm,
                          options: opts,
                          correct_answer: stillValid ? qForm.correct_answer : "",
                        });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <Button size="sm" type="button" onClick={() => addQ.mutate()} disabled={addQ.isPending}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
