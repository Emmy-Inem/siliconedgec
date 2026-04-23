import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, ClipboardCheck, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  completed_at: string;
  quizzes?: { title: string; passing_score: number } | null;
  profile_name?: string;
}

export default function AdminQuizAttempts() {
  const [search, setSearch] = useState("");

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["admin-quiz-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*, quizzes(title, passing_score)")
        .order("completed_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((a) => a.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));

      return (data || []).map((a) => ({ ...a, profile_name: nameMap[a.user_id] || "Unknown" })) as QuizAttempt[];
    },
  });

  const filtered = attempts.filter((a) =>
    (a.profile_name || "").toLowerCase().includes(search.toLowerCase()) ||
    ((a.quizzes as any)?.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const total = attempts.length;
    const passed = attempts.filter((a) => a.score >= ((a.quizzes as any)?.passing_score ?? 70)).length;
    const failed = total - passed;
    const avg = total ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / total) : 0;
    return { total, passed, failed, avg };
  }, [attempts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Quiz Attempts</h1>
          <p className="text-sm text-muted-foreground mt-1">Review every quiz submission and pass rate</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Attempts", value: stats.total, icon: ClipboardCheck, color: "text-primary" },
          { label: "Passed", value: stats.passed, icon: CheckCircle2, color: "text-green-500" },
          { label: "Failed", value: stats.failed, icon: XCircle, color: "text-destructive" },
          { label: "Avg Score", value: `${stats.avg}%`, icon: TrendingUp, color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold font-heading">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search by student or quiz..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quiz</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Score</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Result</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No attempts found</td></tr>
                ) : filtered.map((a) => {
                  const passed = a.score >= ((a.quizzes as any)?.passing_score ?? 70);
                  return (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">{a.profile_name}</td>
                      <td className="px-4 py-3">{(a.quizzes as any)?.title || "—"}</td>
                      <td className="px-4 py-3 font-medium">{a.score}%</td>
                      <td className="px-4 py-3"><Badge variant={passed ? "default" : "destructive"}>{passed ? "Passed" : "Failed"}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{format(new Date(a.completed_at), "MMM d, yyyy")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
