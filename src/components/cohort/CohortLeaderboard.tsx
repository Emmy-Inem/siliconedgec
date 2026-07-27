import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Flame } from "lucide-react";

type Row = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  xp: number;
  weekly_xp: number;
  lessons_completed: number;
  assignments_submitted: number;
};

const MEDALS = ["🥇", "🥈", "🥉"];

/** Friendly cohort leaderboard — gives members a reason to come back weekly. */
export default function CohortLeaderboard({ cohortId, userId }: { cohortId: string; userId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"weekly" | "all">("weekly");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).rpc("get_cohort_leaderboard", { p_cohort_id: cohortId });
      setRows(((data ?? []) as Row[]).filter((r) => r.role !== "instructor"));
      setLoading(false);
    })();
  }, [cohortId]);

  if (loading) return <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const sorted = [...rows].sort((a, b) => (mode === "weekly" ? b.weekly_xp - a.weekly_xp : b.xp - a.xp));
  const me = sorted.findIndex((r) => r.user_id === userId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">Cohort leaderboard</h2>
        </div>
        <div className="ml-auto flex gap-1">
          {(["weekly", "all"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {m === "weekly" ? "This week" : "All time"}
            </button>
          ))}
        </div>
      </div>

      {me >= 0 && (
        <Card className="p-3 flex items-center gap-3 bg-primary/5 border-primary/20">
          <Flame className="h-4 w-4 text-primary" />
          <p className="text-sm">
            You're <span className="font-semibold">#{me + 1}</span> of {sorted.length} this {mode === "weekly" ? "week" : "cohort"} —
            {" "}{mode === "weekly" ? sorted[me].weekly_xp : sorted[me].xp} XP.
          </p>
        </Card>
      )}

      {sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No activity yet — complete a lesson to get on the board.</Card>
      ) : (
        <div className="grid gap-2">
          {sorted.map((r, i) => (
            <Card key={r.user_id} className={`p-3 flex items-center gap-3 ${r.user_id === userId ? "border-primary/40" : ""}`}>
              <span className="w-6 text-center text-sm font-semibold">{MEDALS[i] ?? i + 1}</span>
              <Avatar className="h-8 w-8"><AvatarImage src={r.avatar_url || undefined} /><AvatarFallback>{(r.full_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{r.user_id === userId ? "You" : (r.full_name || "Member")}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.lessons_completed} lessons · {r.assignments_submitted} assignments
                </div>
              </div>
              <Badge variant="secondary" className="text-[11px]">{mode === "weekly" ? r.weekly_xp : r.xp} XP</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}