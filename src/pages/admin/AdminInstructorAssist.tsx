import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ACTIONS = [
  { id: "outline", label: "Course outline", ph: "Topic, audience and target outcome…" },
  { id: "lesson_script", label: "Lesson script", ph: "Lesson title and key points…" },
  { id: "answer_qna", label: "Reply to Q&A", ph: "Paste the student question and any context…" },
  { id: "grade_assignment", label: "Grade an assignment", ph: "Paste the submission and rubric…" },
] as const;

export default function AdminInstructorAssist() {
  const [action, setAction] = useState<typeof ACTIONS[number]["id"]>("outline");
  const [ctx, setCtx] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    if (!ctx.trim()) return;
    setLoading(true); setResult(null);
    const { data, error } = await supabase.functions.invoke("ai-instructor-assist", { body: { action, context: ctx } });
    setLoading(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setResult(data);
  };

  const copy = () => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast({ title: "Copied" }); };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold mb-1 flex items-center gap-2"><Star className="h-5 w-5 text-primary" />Instructor Assist</h2>
        <p className="text-sm text-muted-foreground">AI helpers for outlines, lesson scripts, Q&amp;A drafts and assignment grading.</p>
      </div>
      <Tabs value={action} onValueChange={(v) => setAction(v as any)}>
        <TabsList className="flex-wrap h-auto">
          {ACTIONS.map((a) => <TabsTrigger key={a.id} value={a.id}>{a.label}</TabsTrigger>)}
        </TabsList>
        {ACTIONS.map((a) => (
          <TabsContent key={a.id} value={a.id} className="space-y-3 mt-4">
            <Textarea rows={6} placeholder={a.ph} value={ctx} onChange={(e) => setCtx(e.target.value)} />
            <Button onClick={run} disabled={loading || !ctx.trim()}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}Generate</Button>
          </TabsContent>
        ))}
      </Tabs>
      {result && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm">Result</p>
            <Button size="sm" variant="ghost" onClick={copy}><Copy className="h-3 w-3 mr-1" />Copy</Button>
          </div>
          <pre className="text-xs whitespace-pre-wrap overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}