import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mic, Send, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MarkdownView } from "./MarkdownView";

interface Turn { q: string; a: string; feedback?: string | null }

export function MockInterviewDialog({ defaultRole }: { defaultRole?: string }) {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [role, setRole] = useState(defaultRole ?? "Software Engineer");
  const [level, setLevel] = useState("mid");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [current, setCurrent] = useState<{ q: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [finalReport, setFinalReport] = useState<any>(null);

  const start = async () => {
    setLoading(true); setStarted(true); setTurns([]); setFinalReport(null);
    const { data, error } = await supabase.functions.invoke("ai-mock-interview", { body: { action: "start", role, level, history: [] } });
    if (error) toast({ title: "Couldn't start", description: error.message, variant: "destructive" });
    else setCurrent({ q: data.question });
    setLoading(false);
  };

  const submitAnswer = async () => {
    if (!current || !answer.trim()) return;
    setLoading(true);
    const history = [...turns, { q: current.q, a: answer }];
    const { data, error } = await supabase.functions.invoke("ai-mock-interview", { body: { action: "answer", role, level, history } });
    if (!error) {
      setTurns([...turns, { q: current.q, a: answer, feedback: data.feedback }]);
      setCurrent({ q: data.question });
      setAnswer("");
    } else toast({ title: "Error", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const finish = async () => {
    setLoading(true);
    const history = current && answer ? [...turns, { q: current.q, a: answer }] : turns;
    const { data, error } = await supabase.functions.invoke("ai-mock-interview", { body: { action: "finish", role, level, history } });
    if (!error) setFinalReport(data);
    else toast({ title: "Error", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const reset = () => { setStarted(false); setTurns([]); setCurrent(null); setAnswer(""); setFinalReport(null); };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Mic className="h-4 w-4 mr-1" />Mock interview</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>AI Mock Interview</DialogTitle></DialogHeader>

        {!started && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Practise with a friendly AI interviewer. You'll get real-time feedback and a final report.</p>
            <Input placeholder="Role (e.g. Cloud Engineer)" value={role} onChange={(e) => setRole(e.target.value)} />
            <div className="flex gap-2">
              {["junior", "mid", "senior"].map((l) => (
                <Button key={l} variant={level === l ? "default" : "outline"} size="sm" onClick={() => setLevel(l)}>{l}</Button>
              ))}
            </div>
            <Button onClick={start} disabled={loading} className="w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start interview"}</Button>
          </div>
        )}

        {started && !finalReport && (
          <div className="space-y-3">
            {turns.map((t, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2 text-sm">
                <p className="font-semibold">Q{i + 1}: {t.q}</p>
                <p className="text-muted-foreground italic">Your answer: {t.a}</p>
                {t.feedback && <div className="bg-muted/50 rounded p-2 text-xs"><MarkdownView>{t.feedback}</MarkdownView></div>}
              </div>
            ))}
            {current && (
              <div className="rounded-lg bg-primary/5 border border-primary/30 p-3">
                <p className="text-sm font-semibold mb-2">Q{turns.length + 1}: {current.q}</p>
                <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer…" rows={4} />
                <div className="flex gap-2 mt-2">
                  <Button onClick={submitAnswer} disabled={loading || !answer.trim()} size="sm">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" />Submit & next</>}</Button>
                  {turns.length >= 2 && <Button variant="outline" size="sm" onClick={finish} disabled={loading}>Finish & get report</Button>}
                </div>
              </div>
            )}
          </div>
        )}

        {finalReport && (
          <div className="space-y-3">
            <div className="text-center">
              <Trophy className="h-10 w-10 mx-auto text-amber-500" />
              <p className="font-heading text-3xl font-bold">{finalReport.score}/100</p>
              <p className="text-sm text-muted-foreground">{finalReport.summary}</p>
            </div>
            {!!finalReport.strengths?.length && <div><p className="font-semibold text-sm mb-1">Strengths</p><ul className="text-sm list-disc pl-5">{finalReport.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>}
            {!!finalReport.improvements?.length && <div><p className="font-semibold text-sm mb-1">To improve</p><ul className="text-sm list-disc pl-5">{finalReport.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>}
            <Button onClick={reset} variant="outline" className="w-full">Try again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}