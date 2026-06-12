import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, TrendingUp, Lock } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Props {
  userId: string;
}

/**
 * Compact analytics card for the student dashboard.
 * - Plots lesson completions over the last 8 weeks.
 * - Estimates the next unlock date based on the user's recent cadence.
 */
export function LearningAnalyticsCard({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<{ label: string; completed: number }[]>([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [doneLessons, setDoneLessons] = useState(0);
  const [nextUnlock, setNextUnlock] = useState<{ title: string; date: Date } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Recent progress (last 90 days) for the time-series + cadence calc.
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("lesson_id, is_completed, completed_at, created_at")
        .eq("user_id", userId)
        .eq("is_completed", true)
        .gte("created_at", since);

      // Enrolled courses to compute total lessons across active enrollments.
      const { data: enrollRows } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", userId);

      const courseIds = (enrollRows ?? []).map((e: any) => e.course_id);
      let totalLessonCount = 0;
      let nextLesson: { title: string; module_order: number; lesson_order: number } | null = null;

      if (courseIds.length) {
        const { data: modules } = await supabase
          .from("modules")
          .select("id, course_id, order_index")
          .in("course_id", courseIds);
        const moduleIds = (modules ?? []).map((m: any) => m.id);
        const moduleOrder = new Map<string, number>(
          (modules ?? []).map((m: any) => [m.id, m.order_index]),
        );

        if (moduleIds.length) {
          const { data: lessons } = await supabase
            .from("lessons")
            .select("id, module_id, title, order_index")
            .in("module_id", moduleIds);
          totalLessonCount = (lessons ?? []).length;

          const doneIds = new Set(
            (progress ?? []).map((p: any) => p.lesson_id),
          );
          // Find the next locked lesson in order.
          const ordered = (lessons ?? [])
            .map((l: any) => ({
              id: l.id as string,
              title: l.title as string,
              module_order: moduleOrder.get(l.module_id) ?? 0,
              lesson_order: l.order_index as number,
            }))
            .sort((a, b) =>
              a.module_order === b.module_order
                ? a.lesson_order - b.lesson_order
                : a.module_order - b.module_order,
            );
          const firstLocked = ordered.find((l) => !doneIds.has(l.id));
          if (firstLocked) nextLesson = firstLocked;
        }
      }

      // Build 8-week buckets.
      const buckets: { label: string; completed: number; start: number }[] = [];
      const now = new Date();
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        d.setHours(0, 0, 0, 0);
        buckets.push({
          label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          completed: 0,
          start: d.getTime(),
        });
      }
      const completedTs: number[] = [];
      for (const p of (progress ?? []) as any[]) {
        const t = new Date(p.completed_at ?? p.created_at).getTime();
        if (!t) continue;
        completedTs.push(t);
        for (let i = buckets.length - 1; i >= 0; i--) {
          if (t >= buckets[i].start) {
            buckets[i].completed += 1;
            break;
          }
        }
      }

      // Estimate the next unlock date from the average gap between recent completions.
      let estDate: Date | null = null;
      if (nextLesson && completedTs.length > 0) {
        completedTs.sort((a, b) => a - b);
        const last = completedTs[completedTs.length - 1];
        let avgGapDays = 3; // sensible default
        if (completedTs.length >= 2) {
          const gaps: number[] = [];
          for (let i = 1; i < completedTs.length; i++) {
            gaps.push((completedTs[i] - completedTs[i - 1]) / (24 * 60 * 60 * 1000));
          }
          const filtered = gaps.filter((g) => g > 0 && g < 30);
          if (filtered.length) {
            avgGapDays = filtered.reduce((s, x) => s + x, 0) / filtered.length;
          }
        }
        estDate = new Date(last + Math.max(0.5, avgGapDays) * 24 * 60 * 60 * 1000);
        if (estDate.getTime() < Date.now()) {
          estDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
      }

      if (cancelled) return;
      setSeries(buckets.map((b) => ({ label: b.label, completed: b.completed })));
      setDoneLessons((progress ?? []).length);
      setTotalLessons(totalLessonCount);
      setCompletionRate(
        totalLessonCount > 0
          ? Math.round(((progress ?? []).length / totalLessonCount) * 100)
          : 0,
      );
      setNextUnlock(
        nextLesson && estDate ? { title: nextLesson.title, date: estDate } : null,
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const total8w = useMemo(() => series.reduce((s, b) => s + b.completed, 0), [series]);

  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Learning analytics
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {total8w} lesson{total8w === 1 ? "" : "s"} completed in the last 8 weeks
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-[11px]">
          {completionRate}% overall
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-44 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Loading analytics…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="laGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={28} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#laGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Completion</p>
            <p className="font-heading text-lg font-semibold mt-0.5">
              {doneLessons}<span className="text-sm text-muted-foreground font-normal"> / {totalLessons} lessons</span>
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> Next unlock estimate
            </p>
            {nextUnlock ? (
              <>
                <p className="font-heading text-sm font-semibold mt-0.5 line-clamp-1">
                  {nextUnlock.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  ~ {nextUnlock.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Complete a lesson to see your next unlock.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}