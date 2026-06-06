import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, XCircle, CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { SEO } from "@/components/SEO";

interface Question { id: string; question_text: string; options: string[]; order_index: number }
interface Attempt { id: string; score: number; answers: Record<string,string>; completed_at: string }

export default function QuizAttempts() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz-attempts-page", quizId, user?.id],
    enabled: !!quizId && !!user,
    queryFn: async () => {
      const [{ data: quiz }, { data: qs }, { data: attempts }] = await Promise.all([
        supabase.from("quizzes").select("id, title, passing_score, max_attempts, lesson_id").eq("id", quizId!).maybeSingle(),
        supabase.rpc("get_quiz_questions", { p_quiz_id: quizId! }),
        supabase.from("quiz_attempts").select("id, score, answers, completed_at").eq("quiz_id", quizId!).eq("user_id", user!.id).order("completed_at", { ascending: false }),
      ]);
      return { quiz, questions: (qs ?? []) as unknown as Question[], attempts: (attempts ?? []) as unknown as Attempt[] };
    },
  });

  if (isLoading || !data) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  const { quiz, questions, attempts } = data;
  if (!quiz) return <div className="p-8">Quiz not found.</div>;

  const pass = quiz.passing_score ?? 70;
  const best = attempts.reduce((m, a) => Math.max(m, a.score), 0);
  const passed = attempts.some((a) => a.score >= pass);
  const open = attempts.find((a) => a.id === openId) ?? attempts[0];

  return (
    <main className="min-h-screen bg-background">
      <SEO title={`Quiz attempts · ${quiz.title}`} description="Review your past quiz attempts" />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden /> Back
        </Button>

        <header className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden />
            <h1 className="font-heading text-2xl font-bold">{quiz.title}</h1>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><dt className="text-muted-foreground text-xs">Pass mark</dt><dd className="font-semibold">{pass}%</dd></div>
            <div><dt className="text-muted-foreground text-xs">Attempts</dt><dd className="font-semibold">{attempts.length}{quiz.max_attempts ? ` / ${quiz.max_attempts}` : ""}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Best score</dt><dd className={cn("font-semibold", passed && "text-green-600")}>{best}%</dd></div>
            <div><dt className="text-muted-foreground text-xs">Status</dt><dd className="font-semibold">{passed ? "Passed" : "Not passed"}</dd></div>
          </dl>
        </header>

        <section aria-labelledby="attempts-h">
          <h2 id="attempts-h" className="font-heading text-lg font-semibold mb-3">Attempt history</h2>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attempts yet.</p>
          ) : (
            <ul className="space-y-2">
              {attempts.map((a, i) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(a.id)}
                    aria-pressed={open?.id === a.id}
                    className={cn(
                      "w-full text-left rounded-lg border px-3 py-2 flex items-center justify-between gap-3 transition-colors",
                      open?.id === a.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Attempt #{attempts.length - i}</span>
                      <span>{new Date(a.completed_at).toLocaleString()}</span>
                    </span>
                    <span className={cn("font-semibold text-sm", a.score >= pass ? "text-green-600" : "text-amber-600")}>{a.score}%</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {open && (
          <section aria-labelledby="review-h" className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 id="review-h" className="font-heading text-lg font-semibold">Reviewing attempt</h2>
              {open.score >= pass ? <Trophy className="h-5 w-5 text-gold" aria-label="Passed" /> : <XCircle className="h-5 w-5 text-destructive" aria-label="Did not pass" />}
            </div>
            <ol className="space-y-3">
              {questions.map((q, idx) => {
                const picked = open.answers?.[q.id];
                return (
                  <li key={q.id} className="rounded-lg border border-border bg-background/60 p-3">
                    <p className="text-sm font-medium mb-2">{idx + 1}. {q.question_text}</p>
                    <div className="space-y-1">
                      {(Array.isArray(q.options) ? q.options : []).map((opt, i) => {
                        const isPicked = picked === opt;
                        return (
                          <div key={i} className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs",
                            isPicked ? "border-primary/60 bg-primary/10" : "border-border/50 text-muted-foreground"
                          )}>
                            {isPicked ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden /> : <span className="h-3.5 w-3.5" />}
                            <span>{opt}</span>
                            {isPicked && <span className="ml-auto text-[10px] uppercase">Your answer</span>}
                          </div>
                        );
                      })}
                      {!picked && <p className="text-[11px] text-muted-foreground italic">No answer recorded.</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    </main>
  );
}