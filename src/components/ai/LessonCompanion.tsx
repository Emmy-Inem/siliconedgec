import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Star, Send, X, MessageSquare, BookCheck, FileText, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiTutor } from "@/hooks/useAiTutor";
import { MarkdownView } from "./MarkdownView";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  lessonId?: string;
  lessonTitle?: string;
  courseId?: string;
}

export function LessonCompanion({ lessonId, lessonTitle, courseId }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat");
  const [input, setInput] = useState("");
  const { messages, send, loading, reset } = useAiTutor({
    scope: lessonId ? "lesson" : "course",
    scopeRefId: lessonId ?? courseId,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);
  useEffect(() => { reset(); }, [lessonId, reset]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = input.trim();
    if (!v || loading) return;
    setInput("");
    send(v);
  };

  const quick = (prompt: string) => { setTab("chat"); send(prompt); };

  // Quiz state
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const genQuiz = async () => {
    setQuizLoading(true); setResult(null);
    const { data, error } = await supabase.functions.invoke("ai-quiz", { body: { action: "generate", lessonId, courseId } });
    if (error) {
      const msg = /402/.test(error.message) ? "AI credits are exhausted. Please contact support."
        : /429/.test(error.message) ? "Too many requests — try again in a few seconds."
        : /401|403/.test(error.message) ? "You need to be enrolled in this course to use the AI tutor."
        : error.message;
      toast({ title: "Couldn't build the quiz", description: msg, variant: "destructive" });
    } else { setQuiz(data); setAnswers(new Array(data.questions?.length ?? 0).fill(-1)); }
    setQuizLoading(false);
  };
  const submitQuiz = async () => {
    if (!quiz) return;
    setQuizLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-quiz", { body: { action: "grade", questions: quiz.questions, answers, lessonId, courseId } });
    if (!error) setResult(data);
    setQuizLoading(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open AI tutor"
      >
        <Star className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed z-50 bg-background border border-border shadow-2xl flex flex-col",
      "inset-x-0 bottom-0 h-[85vh] rounded-t-2xl",
      "md:inset-auto md:right-4 md:bottom-4 md:top-20 md:w-[420px] md:rounded-2xl md:h-auto"
    )}>
      <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Star className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-heading font-semibold text-sm leading-tight">Learning Companion</p>
            {lessonTitle && <p className="text-[10px] text-muted-foreground truncate max-w-[220px]">{lessonTitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={reset} title="Start a new chat" aria-label="Start a new AI chat"><RotateCcw className="h-4 w-4" aria-hidden /></Button>
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)} title="Close" aria-label="Close AI tutor"><X className="h-4 w-4" aria-hidden /></Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="m-2 grid grid-cols-3">
          <TabsTrigger value="chat"><MessageSquare className="h-3.5 w-3.5 mr-1" />Chat</TabsTrigger>
          <TabsTrigger value="quiz"><BookCheck className="h-3.5 w-3.5 mr-1" />Quiz</TabsTrigger>
          <TabsTrigger value="summary"><FileText className="h-3.5 w-3.5 mr-1" />Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1">Ask me anything about this lesson, or try:</p>
                {["Explain this lesson in simple terms", "Give me a real-world example", "What's the most important takeaway?"].map((p) => (
                  <button key={p} onClick={() => quick(p)} className="block w-full text-left text-xs rounded-lg border border-border bg-muted/30 hover:bg-muted px-3 py-2 transition-colors">{p}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("rounded-xl px-3 py-2 text-sm", m.role === "user" ? "bg-primary text-primary-foreground ml-6" : "bg-muted mr-6")}>
                {m.role === "user" ? m.content : <MarkdownView>{m.content || "…"}</MarkdownView>}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="rounded-xl px-3 py-2 bg-muted mr-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Thinking…</div>
            )}
          </div>
          <form onSubmit={submit} className="p-2 border-t border-border flex gap-2" aria-label="Ask the AI tutor">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything…" disabled={loading} className="text-sm" aria-label="Message" />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send message">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="quiz" className="flex-1 overflow-y-auto p-3 space-y-3 m-0">
          {!quiz && (
            <Button onClick={genQuiz} disabled={quizLoading} className="w-full">
              {quizLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Building quiz…</> : <><BookCheck className="h-4 w-4 mr-2" />Generate 5 questions</>}
            </Button>
          )}
          {quiz?.questions?.map((q: any, idx: number) => (
            <div key={idx} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium mb-2">{idx + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {q.options.map((opt: string, oi: number) => {
                  const picked = answers[idx] === oi;
                  const reveal = result != null;
                  const correct = q.correct_index === oi;
                  return (
                    <button key={oi} disabled={reveal} onClick={() => setAnswers((a) => a.map((v, i) => i === idx ? oi : v))}
                      className={cn("w-full text-left text-xs rounded-md border px-2 py-1.5 transition-colors",
                        reveal && correct && "border-green-500 bg-green-500/10",
                        reveal && picked && !correct && "border-destructive bg-destructive/10",
                        !reveal && picked && "border-primary bg-primary/10",
                        !picked && !reveal && "border-border hover:bg-muted")}>{opt}</button>
                  );
                })}
              </div>
              {result != null && <p className="text-[11px] text-muted-foreground mt-2">{q.explanation}</p>}
            </div>
          ))}
          {quiz && result == null && (
            <Button onClick={submitQuiz} disabled={quizLoading || answers.includes(-1)} className="w-full">Submit answers</Button>
          )}
          {result && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-center">
              <p className="font-heading text-2xl font-bold">{result.score}%</p>
              <p className="text-xs text-muted-foreground">{result.correct} of {result.total} correct</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { setQuiz(null); setResult(null); setAnswers([]); }}>Try another quiz</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="flex-1 overflow-y-auto p-3 m-0 space-y-2">
          <Button onClick={() => quick("Give me a concise TL;DR of this lesson with 3 key takeaways and 1 action item.")} className="w-full"><FileText className="h-4 w-4 mr-2" />Summarize this lesson</Button>
          <Button variant="outline" onClick={() => quick("Suggest 3 hands-on exercises I can do to practice this lesson.")} className="w-full">Suggest practice exercises</Button>
          <Button variant="outline" onClick={() => quick("What common mistakes do beginners make with this topic?")} className="w-full">Common pitfalls</Button>
          <p className="text-[11px] text-muted-foreground text-center pt-2">Tap any prompt — answer appears in the Chat tab.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}