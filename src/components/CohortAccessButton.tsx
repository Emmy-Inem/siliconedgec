import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, ArrowRight, Sparkles } from "lucide-react";

const db = supabase as any;

/**
 * Renders a CTA linking to the user's cohort space for the given course
 * (if they belong to one). Silent when no membership exists.
 */
export function CohortAccessButton({ courseId, variant = "card" }: { courseId?: string | null; variant?: "card" | "inline" }) {
  const { user } = useAuth();
  const [cohort, setCohort] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!user || !courseId) { setCohort(null); return; }
    (async () => {
      const { data: cohorts } = await db.from("cohorts").select("id, name").eq("course_id", courseId);
      const ids = (cohorts || []).map((c: any) => c.id);
      if (ids.length === 0) return;
      const { data: m } = await db.from("cohort_members").select("cohort_id").eq("user_id", user.id).in("cohort_id", ids).limit(1).maybeSingle();
      if (m) {
        const match = (cohorts || []).find((c: any) => c.id === m.cohort_id);
        if (match) setCohort({ id: match.id, name: match.name });
      }
    })();
  }, [user, courseId]);

  if (!cohort) return null;

  if (variant === "inline") {
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

  return (
    <Link to={`/cohorts/${cohort.id}`} className="block group">
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
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
        </div>
      </div>
    </Link>
  );
}