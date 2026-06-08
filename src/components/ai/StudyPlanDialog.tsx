import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Star, Loader2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function StudyPlanDialog({ courseId, trigger }: { courseId: string; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(5);
  const [target, setTarget] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const generate = async () => {
    setLoading(true); setPlan(null);
    const { data, error } = await supabase.functions.invoke("ai-study-plan", { body: { courseId, hoursPerWeek: hours, targetDate: target || null } });
    if (error) toast({ title: "Couldn't build plan", description: error.message, variant: "destructive" });
    else setPlan(data.plan);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button variant="outline"><Star className="h-4 w-4 mr-2" />Generate study plan</Button>}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Star className="h-4 w-4 text-primary" />AI Study Plan</DialogTitle></DialogHeader>
        {!plan && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium">Hours per week: <span className="text-primary">{hours}</span></label>
              <Slider value={[hours]} onValueChange={(v) => setHours(v[0])} min={1} max={20} step={1} className="mt-2" />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Target completion date (optional)</label>
              <Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-2" />
            </div>
            <Button onClick={generate} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Building plan…</> : "Build my plan"}
            </Button>
          </div>
        )}
        {plan && (
          <div className="space-y-3">
            {plan.weeks?.map((w: any) => (
              <div key={w.week} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-heading font-semibold">Week {w.week} · {w.focus}</p>
                  <span className="text-xs text-muted-foreground">~{w.estimated_hours}h</span>
                </div>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {w.tasks?.map((t: string, i: number) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            ))}
            {plan.tips?.length > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-sm font-semibold mb-1">Coach tips</p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">{plan.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
            <Button variant="outline" onClick={() => setPlan(null)} className="w-full">Build a new plan</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}