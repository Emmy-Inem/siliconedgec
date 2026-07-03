import { useOutletContext, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { InstructorOutletContext } from "./InstructorLayout";

const db = supabase as any;

export default function InstructorAssignments() {
  const { activeCohort } = useOutletContext<InstructorOutletContext>();

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-assignments", activeCohort?.course_id],
    enabled: !!activeCohort?.course_id,
    queryFn: async () => {
      const { data: mods } = await db
        .from("modules")
        .select("id, lessons:lessons(id, title)")
        .eq("course_id", activeCohort!.course_id!);
      const lessons = (mods ?? []).flatMap((m: any) => m.lessons ?? []);
      const lessonIds = lessons.map((l: any) => l.id);
      if (!lessonIds.length) return { rows: [] };
      const { data: assignments } = await db
        .from("assignments")
        .select("id, title, lesson_id, due_at, max_points")
        .in("lesson_id", lessonIds);
      const aIds = (assignments ?? []).map((a: any) => a.id);
      let subCounts: Record<string, { total: number; ungraded: number }> = {};
      if (aIds.length) {
        const { data: subs } = await db
          .from("assignment_submissions")
          .select("assignment_id, grade")
          .in("assignment_id", aIds);
        (subs ?? []).forEach((s: any) => {
          const c = (subCounts[s.assignment_id] ??= { total: 0, ungraded: 0 });
          c.total += 1;
          if (s.grade == null) c.ungraded += 1;
        });
      }
      const lessonMap = new Map<string, string>();
      lessons.forEach((l: any) => lessonMap.set(l.id, l.title));
      return {
        rows: (assignments ?? []).map((a: any) => ({
          ...a,
          lesson_title: lessonMap.get(a.lesson_id) ?? "Lesson",
          submissions: subCounts[a.id]?.total ?? 0,
          ungraded: subCounts[a.id]?.ungraded ?? 0,
        })),
      };
    },
  });

  if (!activeCohort) return null;
  if (!activeCohort.course_id) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        This cohort isn't linked to a course yet — attach one in the admin cohorts page to grade assignments here.
      </Card>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">Assignments</h1>
        <p className="text-sm text-muted-foreground">{activeCohort.course_title}</p>
      </div>
      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (data?.rows ?? []).length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No assignments in this course yet.</Card>
      ) : (
        <div className="space-y-3">
          {data!.rows.map((a: any) => (
            <Link key={a.id} to={`/instructor/assignments/${a.id}`}>
              <Card className="p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground truncate">Lesson: {a.lesson_title}</div>
                    {a.due_at && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Due {new Date(a.due_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline">{a.submissions} submitted</Badge>
                    {a.ungraded > 0 && <Badge className="bg-amber-500 hover:bg-amber-500 text-white">{a.ungraded} to grade</Badge>}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}