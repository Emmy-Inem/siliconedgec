import { useState } from "react";
import { Briefcase, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { MarkdownView } from "./MarkdownView";

interface CoachResult {
  headline?: string;
  summary?: string;
  matched_jobs?: { id: string | null; title: string; fit_reason: string }[];
  skill_gaps?: { skill: string; why: string; suggested_course_category: string }[];
  cover_letter?: string;
}

export function CareerCoachCard({ jobId }: { jobId?: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoachResult | null>(null);
  const [showLetter, setShowLetter] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-career-coach", { body: { jobId } });
    if (!error && data) setResult(data as CoachResult);
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0">
          <Briefcase className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-500 mb-1 font-semibold">AI Career Coach</p>
          {!result && (
            <>
              <h3 className="font-heading text-lg md:text-xl font-bold mb-1">{jobId ? "Should I apply?" : "Match me to jobs"}</h3>
              <p className="text-sm text-muted-foreground mb-3">{jobId ? "Get a fit summary, skill gaps, and a cover letter draft tailored to this role." : "Personalised job matches based on the courses you've completed."}</p>
              <Button size="sm" onClick={run} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Analysing</> : <><Sparkles className="h-4 w-4 mr-1" />Run coach</>}
              </Button>
            </>
          )}
          {result && (
            <div className="space-y-3">
              {result.headline && <h3 className="font-heading text-lg font-bold">{result.headline}</h3>}
              {result.summary && <p className="text-sm text-muted-foreground">{result.summary}</p>}
              {!!result.matched_jobs?.length && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Top matches</p>
                  <ul className="space-y-1.5">
                    {result.matched_jobs.slice(0, 3).map((j, i) => (
                      <li key={i} className="text-sm"><span className="font-semibold">{j.title}</span> — <span className="text-muted-foreground">{j.fit_reason}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {!!result.skill_gaps?.length && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Skill gaps to close</p>
                  <ul className="space-y-1.5">
                    {result.skill_gaps.slice(0, 3).map((g, i) => (
                      <li key={i} className="text-sm"><span className="font-semibold">{g.skill}</span> — <span className="text-muted-foreground">{g.why}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {result.cover_letter && (
                <div>
                  <Button size="sm" variant="ghost" onClick={() => setShowLetter((s) => !s)}>
                    {showLetter ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />} Cover-letter draft
                  </Button>
                  {showLetter && (
                    <div className="text-sm bg-muted/40 rounded-lg p-3 mt-2"><MarkdownView>{result.cover_letter}</MarkdownView></div>
                  )}
                </div>
              )}
              <Button size="sm" variant="outline" onClick={run} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}Refresh
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}