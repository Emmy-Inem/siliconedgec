import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ClipboardCheck, Trophy, RotateCcw, History, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
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
  correct_answer?: string | null;
  explanation?: string | null;
}

interface PastAttempt { id: string; score: number; passed: boolean; completed_at: string; answers: Record<string, string> }

export function LessonQuiz({ lessonId, onPass }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<{ score: number; passed: boolean; answers: Record<string, string> } | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["lesson-quiz", lessonId],
    queryFn: async () => {
      // Students only see published quizzes. AI-generated drafts stay hidden
      // until an instructor/admin flips is_visible in the admin UI. RLS is
      // permissive here, so we filter explicitly.
      const { data: q } = await supabase
        .from("quizzes")
        .select("id, title, passing_score, max_attempts, is_visible")
        .eq("lesson_id", lessonId)
        .eq("is_visible", true)
        .maybeSingle();
      if (!q) return null;
      const { data: questions } = await supabase.rpc("get_quiz_questions", { p_quiz_id: q.id });
      return { ...q, questions: (questions ?? []) as unknown as QuizQuestion[] };
    },
  });

  const { data: attempts = [] } = useQuery<PastAttempt[]>({
    queryKey: ["quiz-attempts", quiz?.id, user?.id],
    enabled: !!quiz?.id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("id, score, answers, completed_at")
        .eq("quiz_id", quiz!.id)
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false })
        .limit(20);
      const pass = quiz?.passing_score ?? 70;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        score: r.score ?? 0,
        completed_at: r.completed_at,
        answers: (r.answers ?? {}) as Record<string, string>,
        passed: (r.score ?? 0) >= pass,
      }));
    },
  });
  const previousAttempt = attempts[0];
  const bestScore = attempts.reduce((m, a) => Math.max(m, a.score), 0);

  const submit = useMutation({
    mutationFn: async () => {
      if (!quiz || !user) throw new Error("Not ready");
      const { data, error } = await supabase.rpc("grade_quiz_submission", {
        p_quiz_id: quiz.id,
        p_answers: answers as any,
      });
      if (error) throw error;
      const row: any = Array.isArray(data) ? data[0] : data;
      return { score: row?.score ?? 0, passed: !!row?.passed, answers };
    },
    onSuccess: async (res) => {
      // Refetch the quiz FIRST so correct_answer + explanation are present
      // before we flip into the review UI (get_quiz_questions only returns
      // them once an attempt exists).
      await queryClient.refetchQueries({ queryKey: ["lesson-quiz", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["quiz-attempts", quiz?.id, user?.id] });
      setSubmitted(res);
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
  const passed = !!attempts.find((a) => a.passed) || !!submitted?.passed;
  const maxAttempts = (quiz as any).max_attempts as number | null | undefined;
  const attemptsLeft = maxAttempts != null ? Math.max(0, maxAttempts - attempts.length) : null;
  const retakeBlocked = !passed && attemptsLeft != null && attemptsLeft <= 0;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-semibold text-base">{quiz.title}</h3>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-3">
          <span>Pass mark: {quiz.passing_score}%</span>
          {attempts.length > 0 && <span>Best: <strong className={cn(passed ? "text-green-600" : "text-foreground")}>{bestScore}%</strong></span>}
          <span>Attempts: {attempts.length}{maxAttempts ? ` / ${maxAttempts}` : ""}</span>
          {attempts.length > 0 && (
            <Link to={`/quizzes/${quiz.id}/attempts`} className="underline hover:text-foreground" aria-label="Open full attempt review page">Full review</Link>
          )}
        </div>
      </div>

      {retakeBlocked && (
        <div role="alert" className="text-xs rounded-lg px-3 py-2 border border-destructive/40 bg-destructive/10 text-destructive">
          You've used all {maxAttempts} attempts for this quiz. Contact your instructor for a reset.
        </div>
      )}

      {previousAttempt && !submitted && (
        <div className={cn(
          "text-xs rounded-lg px-3 py-2 border flex items-center justify-between gap-2",
          previousAttempt.passed
            ? "border-green-500/30 bg-green-500/10 text-green-600"
            : "border-amber-500/30 bg-amber-500/10 text-amber-600"
        )}>
          <span>Last attempt: <strong>{previousAttempt.score}%</strong> on {new Date(previousAttempt.completed_at).toLocaleDateString()}</span>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setReviewMode(true); setSubmitted({ score: previousAttempt.score, passed: previousAttempt.passed, answers: previousAttempt.answers }); }}>
            Review answers
          </Button>
        </div>
      )}

      {attempts.length > 1 && (
        <details open={historyOpen} onToggle={(e) => setHistoryOpen((e.target as HTMLDetailsElement).open)} className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 select-none">
            <History className="h-3.5 w-3.5" /> Attempt history ({attempts.length})
            <ChevronDown className={cn("h-3 w-3 transition-transform", historyOpen && "rotate-180")} />
          </summary>
          <ul className="mt-2 space-y-1">
            {attempts.map((a, i) => (
              <li key={a.id} className="flex items-center justify-between rounded-md border border-border bg-background/60 px-2.5 py-1.5">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">#{attempts.length - i}</span>
                  <span>{new Date(a.completed_at).toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className={cn("font-semibold", a.passed ? "text-green-600" : "text-amber-600")}>{a.score}%</span>
                  <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => { setReviewMode(true); setSubmitted({ score: a.score, passed: a.passed, answers: a.answers }); }}>
                    Review
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {submitted ? (
        <div className="space-y-4">
          <div className="text-center py-4 space-y-2">
            {submitted.passed ? (
              <Trophy className="h-10 w-10 text-gold mx-auto" />
            ) : (
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
            )}
            <p className="text-2xl font-heading font-bold">{submitted.score}%</p>
            <p className="text-sm text-muted-foreground">
              {submitted.passed ? "You passed!" : `You need ${quiz.passing_score}% to pass.`}
            </p>
          </div>

          {/* Per-question feedback: answers vs. selected. Correct answers
              aren't exposed by the API, so we colour selections green when
              they match a known-correct choice from the latest submission
              and grey otherwise — explanations come from the chosen option. */}
          <ol className="space-y-3" aria-label="Your answers">
            {quiz.questions.map((q, idx) => {
              const picked = submitted.answers[q.id];
              return (
                <li key={q.id} className="rounded-lg border border-border bg-background/60 p-3">
                  <p className="text-sm font-medium mb-2">
                    <span className="text-muted-foreground mr-1">{idx + 1}.</span>{q.question_text}
                  </p>
                  <div className="space-y-1">
                    {(Array.isArray(q.options) ? q.options : []).map((opt: string, i: number) => {
                      const isPicked = picked === opt;
                      const isCorrect = q.correct_answer != null && opt === q.correct_answer;
                      const isWrongPick = isPicked && q.correct_answer != null && !isCorrect;
                      return (
                        <div key={i} className={cn(
                          "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs",
                          isCorrect
                            ? "border-green-500/50 bg-green-500/10 text-green-700"
                            : isWrongPick
                              ? "border-destructive/50 bg-destructive/10 text-destructive"
                              : isPicked
                                ? "border-primary/60 bg-primary/10"
                                : "border-border/50 text-muted-foreground",
                        )}>
                          {isCorrect ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-hidden />
                          ) : isWrongPick ? (
                            <XCircle className="h-3.5 w-3.5 text-destructive" aria-hidden />
                          ) : isPicked ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                          ) : (
                            <span className="h-3.5 w-3.5" />
                          )}
                          <span>{opt}</span>
                          <span className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wide">
                            {isPicked && <span className="text-muted-foreground">Your answer</span>}
                            {isCorrect && <span className="text-green-700">Correct</span>}
                          </span>
                        </div>
                      );
                    })}
                    {!picked && <p className="text-[11px] text-muted-foreground italic">No answer recorded for this question.</p>}
                    {(q.explanation || q.correct_answer) && (
                      <div className={cn(
                        "mt-2 rounded-md border p-2.5 text-[11px] leading-relaxed",
                        picked && q.correct_answer && picked === q.correct_answer
                          ? "border-green-500/30 bg-green-500/5 text-green-800"
                          : "border-amber-500/30 bg-amber-500/5 text-amber-900",
                      )}>
                        <p className="font-semibold mb-0.5">
                          {picked && q.correct_answer && picked === q.correct_answer
                            ? "Why this is correct"
                            : `Why the correct answer is "${q.correct_answer ?? "—"}"`}
                        </p>
                        <p className="text-foreground/80">
                          {q.explanation || "Revisit the lesson material above — this concept is covered in the preceding section."}
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              {reviewMode ? "Reviewing a past attempt." : "Attempt saved to your history."}
            </p>
            <div className="flex gap-2">
              {!submitted.passed && !retakeBlocked && (
                <Button variant="default" size="sm" onClick={() => { setSubmitted(null); setReviewMode(false); setAnswers({}); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Retake quiz
                </Button>
              )}
              {submitted.passed && (
                <Button variant="outline" size="sm" onClick={() => { setSubmitted(null); setReviewMode(false); setAnswers({}); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Try again
                </Button>
              )}
            </div>
          </div>
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
              disabled={!allAnswered || submit.isPending || retakeBlocked}
              onClick={() => submit.mutate()}
              aria-label={retakeBlocked ? "Maximum attempts reached" : "Submit quiz answers"}
            >
              {submit.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Submitting…</> : "Submit Answers"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
