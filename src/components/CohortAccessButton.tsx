import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, ArrowRight, Sparkles, Loader2, AlertCircle, ChevronDown, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const db = supabase as any;

/**
 * Renders a CTA linking to the user's cohort space for the given course.
 * Includes loading/error states, multi-cohort selector dialog, and a nice empty-state CTA.
 */
export function CohortAccessButton({ courseId, variant = "card" }: { courseId?: string | null; variant?: "card" | "inline" }) {
  const { user } = useAuth();
  const [cohort, setCohort] = useState<{ id: string; name: string } | null>(null);
  const [allCohorts, setAllCohorts] = useState<{ id: string; name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);

  useEffect(() => {
    if (!user || !courseId) {
      setCohort(null);
      setAllCohorts([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: cohorts, error: cErr } = await db.from("cohorts").select("id, name").eq("course_id", courseId);
        if (cErr) throw cErr;
        const ids = (cohorts || []).map((c: any) => c.id);
        if (ids.length === 0) {
          if (mounted) { setCohort(null); setAllCohorts([]); }
          return;
        }
        const { data: ms, error: mErr } = await db.from("cohort_members").select("cohort_id, role").eq("user_id", user.id).in("cohort_id", ids);
        if (mErr) throw mErr;
        if (!mounted) return;

        if (ms && ms.length > 0) {
          const matches = ms.map((m: any) => {
            const match = (cohorts || []).find((c: any) => c.id === m.cohort_id);
            return match ? { id: match.id, name: match.name, role: m.role } : null;
          }).filter(Boolean) as { id: string; name: string; role: string }[];

          setAllCohorts(matches);
          if (matches.length > 0) {
            setCohort({ id: matches[0].id, name: matches[0].name });
          } else {
            setCohort(null);
          }
        } else {
          setCohort(null);
          setAllCohorts([]);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to load cohort access");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, courseId]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/50 p-4 flex items-center gap-3 animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
        <div className="text-xs text-muted-foreground font-medium">Checking cohort access...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3 text-destructive">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div className="text-xs font-medium truncate">{error}</div>
      </div>
    );
  }

  if (variant === "inline") {
    if (!cohort) return null;
    return (
      <Link
        to={`/cohorts/${cohort.id}`}
        className="inline-flex items-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/20 px-3 py-2 text-sm font-medium text-primary transition-colors"
      >
        <Users className="h-4 w-4" />
        Open Cohort Space
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  if (!cohort) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/20 to-card p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Cohort Space</div>
            <div className="font-heading font-semibold text-sm mt-0.5">Not assigned to a cohort yet</div>
            <p className="text-xs text-muted-foreground mt-0.5">When your instructor invites you to a peer group for this course, your live discussions and resources will appear here.</p>
            <Link to="/cohorts" className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-2">
              Browse all my cohorts <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isMultiple = allCohorts.length > 1;

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4 hover:border-primary/60 hover:shadow-md transition-all">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary font-semibold">
              <Sparkles className="h-3 w-3" /> Cohort access
            </div>
            <div className="font-heading font-semibold truncate mt-0.5">{cohort.name}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Discussion, live sessions, materials, roster.</p>
            
            <div className="flex items-center gap-3 mt-2.5">
              <Link
                to={`/cohorts/${cohort.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Enter Cohort Space <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {isMultiple && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setSelectorOpen(true); }}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Switch ({allCohorts.length}) <ChevronDown className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Select Cohort Space</DialogTitle>
            <DialogDescription className="text-xs">
              You are enrolled in multiple cohort spaces tied to this course. Pick which one to open.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            {allCohorts.map((c) => {
              const active = c.id === cohort.id;
              return (
                <Link
                  key={c.id}
                  to={`/cohorts/${c.id}`}
                  onClick={() => setSelectorOpen(false)}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                    active ? "border-primary bg-primary/10 text-foreground font-medium shadow-sm" : "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-heading truncate">{c.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Role: {c.role}</div>
                  </div>
                  {active ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}