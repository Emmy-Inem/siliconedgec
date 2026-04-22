import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Activity, Loader2, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function AdminCourseHealth() {
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["health-enrollments"],
    queryFn: async () => (await supabase.from("enrollments").select("course_id, progress_percentage, is_completed").limit(5000)).data ?? [],
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["health-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, title, students_enrolled").eq("is_published", true)).data ?? [],
  });
  const { data: progress = [] } = useQuery({
    queryKey: ["health-progress"],
    queryFn: async () => (await supabase.from("lesson_progress").select("lesson_id, is_completed").limit(10000)).data ?? [],
  });
  const { data: lessons = [] } = useQuery({
    queryKey: ["health-lessons"],
    queryFn: async () => (await supabase.from("lessons").select("id, title, module_id, order_index")).data ?? [],
  });
  const { data: modules = [] } = useQuery({
    queryKey: ["health-modules"],
    queryFn: async () => (await supabase.from("modules").select("id, course_id")).data ?? [],
  });

  const courseStats = useMemo(() => {
    return courses.map((c: any) => {
      const enr = enrollments.filter((e: any) => e.course_id === c.id);
      const avg = enr.length ? enr.reduce((s, e: any) => s + Number(e.progress_percentage || 0), 0) / enr.length : 0;
      const completed = enr.filter((e: any) => e.is_completed).length;
      return { ...c, total: enr.length, avgProgress: avg, completed, completionRate: enr.length ? (completed / enr.length) * 100 : 0 };
    }).sort((a, b) => b.total - a.total);
  }, [courses, enrollments]);

  const dropOffLessons = useMemo(() => {
    const lessonMap = new Map(lessons.map((l: any) => [l.id, l]));
    const moduleMap = new Map(modules.map((m: any) => [m.id, m]));
    const counts: Record<string, { completed: number; total: number; title: string; courseId: string }> = {};
    progress.forEach((p: any) => {
      const l = lessonMap.get(p.lesson_id) as any;
      if (!l) return;
      const m = moduleMap.get(l.module_id) as any;
      const k = p.lesson_id;
      counts[k] ??= { completed: 0, total: 0, title: l.title, courseId: m?.course_id };
      counts[k].total++;
      if (p.is_completed) counts[k].completed++;
    });
    return Object.entries(counts).map(([id, v]) => ({
      id, ...v,
      rate: v.total ? (v.completed / v.total) * 100 : 0,
      courseTitle: courses.find((c: any) => c.id === v.courseId)?.title ?? "—",
    })).filter((x) => x.total >= 3).sort((a, b) => a.rate - b.rate).slice(0, 15);
  }, [progress, lessons, modules, courses]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Activity className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Course Health</h1>
          <p className="text-sm text-muted-foreground">Engagement, completion and drop-off insights per course</p>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h2 className="font-heading text-sm font-semibold mb-3">Engagement by course</h2>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : courseStats.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data.</p>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                {courseStats.map((c) => (
                  <div key={c.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate">{c.title}</span>
                      <span className="text-muted-foreground">{c.completed}/{c.total} done · {c.avgProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={c.avgProgress} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-heading text-sm font-semibold mb-3 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" /> Drop-off lessons (lowest completion)</h2>
            {dropOffLessons.length === 0 ? (
              <p className="text-xs text-muted-foreground">Not enough lesson progress data yet.</p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-2">
                {dropOffLessons.map((l) => (
                  <div key={l.id} className="p-2.5 rounded-md border border-border">
                    <p className="text-sm font-medium truncate">{l.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{l.courseTitle}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <Progress value={l.rate} className="h-1 flex-1 mr-2" />
                      <span className="text-[10px] text-muted-foreground tabular-nums">{l.completed}/{l.total} ({l.rate.toFixed(0)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}