import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ClipboardCheck, Trophy, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  lessonId: string;
  onPass?: () => void;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  order_index: number;
}

export function LessonQuiz({ lessonId, onPass }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<{ score: number; passed: boolean } | null>(null);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["lesson-quiz", lessonId],
    queryFn: async () => {
      const { data: q } = await supabase
        .from("quizzes")
        .select("id, title, passing_score")
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (!q) return null;
      const { data: questions } = await supabase.rpc("get_quiz_questions", { p_quiz_id: q.id });
      return { ...q, questions: (questions ?? []) as unknown as QuizQuestion[] };
    },
  });

  const { data: previousAttempt } = useQuery({
    queryKey: ["quiz-attempt", quiz?.id, user?.id],
    enabled: !!quiz?.id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("score, completed_at")
        .eq("quiz_id", quiz!.id)
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!quiz || !user) throw new Error("Not ready");
      const { data, error } = await supabase.rpc("grade_quiz_submission", {
        p_quiz_id: quiz.id,
        p_answers: answers as any,
      });
      if (error) throw error;
      const row: any = Array.isArray(data) ? data[0] : data;
      return { score: row?.score ?? 0, passed: !!row?.passed };
    },
    onSuccess: (res) => {
      setSubmitted(res);
      queryClient.invalidateQueries({ queryKey: ["quiz-attempt", quiz?.id, user?.id] });
      if (res.passed) {
        toast({ title: `Passed with ${res.score}%!`, description: "Next lesson unlocked." });
        onPass?.();
      } else {
        toast({ title: `Score: ${res.score}%`, description: `You need ${quiz?.passing_score}% to pass. Try again.`, variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Error submitting quiz", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading quiz…</div>;
  }
  if (!quiz) return null;
  if (!quiz.questions.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Quiz set up but no questions added yet.
      </div>
    );
  }

  const allAnswered = quiz.questions.every((q) => answers[q.id]);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-semibold text-base">{quiz.title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">Pass mark: {quiz.passing_score}%</span>
      </div>

      {previousAttempt && !submitted && (
        <div className={cn(
          "text-xs rounded-lg px-3 py-2 border",
          previousAttempt.score >= quiz.passing_score
            ? "border-green-500/30 bg-green-500/10 text-green-600"
            : "border-amber-500/30 bg-amber-500/10 text-amber-600"
        )}>
          Last attempt: <strong>{previousAttempt.score}%</strong> on {new Date(previousAttempt.completed_at).toLocaleDateString()}
        </div>
      )}

      {submitted ? (
        <div className="text-center py-6 space-y-3">
          {submitted.passed ? (
            <Trophy className="h-12 w-12 text-gold mx-auto" />
          ) : (
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
          )}
          <p className="text-2xl font-heading font-bold">{submitted.score}%</p>
          <p className="text-sm text-muted-foreground">
            {submitted.passed ? "You passed!" : `You need ${quiz.passing_score}% to pass.`}
          </p>
          {!submitted.passed && (
            <Button variant="outline" size="sm" onClick={() => { setSubmitted(null); setAnswers({}); }}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Try again
            </Button>
          )}
        </div>
      ) : (
        <>
          <ol className="space-y-4">
            {quiz.questions.map((q, idx) => (
              <li key={q.id} className="space-y-2">
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                  {q.question_text}
                </p>
                <div className="space-y-1.5">
                  {(Array.isArray(q.options) ? q.options : []).map((opt: string, i: number) => (
                    <label
                      key={i}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors",
                        answers[q.id] === opt
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/30 hover:bg-muted/30"
                      )}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                        className="accent-primary"
                      />
                      <span>{opt}</span>
                      {answers[q.id] === opt && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              size="sm"
              disabled={!allAnswered || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Submitting…</> : "Submit Answers"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
