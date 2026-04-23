import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Trash2, Plus, Check } from "lucide-react";

export interface AIQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

interface Props {
  onAccept: (questions: AIQuestion[]) => void;
  defaultTopic?: string;
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export function QuizAIGenerator({ onAccept, defaultTopic = "" }: Props) {
  const { toast } = useToast();
  const [source, setSource] = useState("");
  const [topic, setTopic] = useState(defaultTopic);
  const [num, setNum] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);

  const generate = async () => {
    if (source.trim().length < 20) {
      toast({ title: "Add more source material (at least 20 characters)", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { source_text: source, num_questions: num, difficulty, topic },
      });
      if (error) throw error;
      const qs: AIQuestion[] = (data?.questions ?? []).map((q: any) => ({
        question: String(q.question || ""),
        options: Array.isArray(q.options) ? q.options.map(String).slice(0, 4) : [],
        correct_answer: String(q.correct_answer || ""),
        explanation: q.explanation ? String(q.explanation) : undefined,
      }));
      if (qs.length === 0) throw new Error("No questions returned");
      setQuestions(qs);
      toast({ title: `Generated ${qs.length} questions — review and save` });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateQ = (i: number, patch: Partial<AIQuestion>) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const updateOption = (i: number, oi: number, value: string) =>
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== i) return q;
        const opts = [...q.options];
        const wasCorrect = opts[oi] === q.correct_answer;
        opts[oi] = value;
        return { ...q, options: opts, correct_answer: wasCorrect ? value : q.correct_answer };
      }),
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">
          <label className="text-xs font-medium block mb-1">Topic / Title (optional)</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} className={inputClass} placeholder="e.g. Cloud architecture basics" />
        </div>
        <div className="sm:col-span-3">
          <label className="text-xs font-medium block mb-1">Source material</label>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={6}
            className={inputClass}
            placeholder="Paste lesson text, outline, or any reference material the AI should base questions on..."
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1"># Questions</label>
          <input type="number" min={3} max={20} value={num} onChange={(e) => setNum(Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Difficulty</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className={inputClass}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={generate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {loading ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Preview ({questions.length} questions) — edit before saving</p>
            <Button size="sm" onClick={() => onAccept(questions)}>
              <Check className="h-3 w-3 mr-1" /> Use these questions
            </Button>
          </div>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
            {questions.map((q, i) => (
              <div key={i} className="bg-muted/40 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-muted-foreground mt-2">Q{i + 1}</span>
                  <textarea
                    value={q.question}
                    onChange={(e) => updateQ(i, { question: e.target.value })}
                    rows={2}
                    className={inputClass}
                  />
                  <button
                    onClick={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-destructive p-1.5 hover:bg-destructive/10 rounded mt-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1 pl-7">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={q.correct_answer === opt}
                        onChange={() => updateQ(i, { correct_answer: opt })}
                      />
                      <input
                        value={opt}
                        onChange={(e) => updateOption(i, oi, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setQuestions((prev) => [
                ...prev,
                { question: "", options: ["", "", "", ""], correct_answer: "" },
              ])
            }
          >
            <Plus className="h-3 w-3 mr-1" /> Add empty question
          </Button>
        </div>
      )}
    </div>
  );
}