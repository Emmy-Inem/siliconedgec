import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssignmentPanel } from "@/components/learning/AssignmentPanel";
import { useCourse } from "@/hooks/useCourses";
import { FileCheck2, ChevronLeft, Loader2 } from "lucide-react";
import { courseHref } from "@/lib/course-url";
import { SEO } from "@/components/SEO";

export default function CourseAssignments() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: course, isLoading: courseLoading } = useCourse(id);
  const courseId = course?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["course-assignments", courseId, user?.id],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: modules } = await supabase
        .from("modules").select("id, title, order_index, lessons:lessons(id, title, order_index)")
        .eq("course_id", courseId!).order("order_index");
      const lessonIds = (modules ?? []).flatMap((m: any) => (m.lessons ?? []).map((l: any) => l.id));
      if (!lessonIds.length) return { modules: modules ?? [], assignments: [], subs: [] };
      const { data: assignments } = await supabase
        .from("assignments").select("id, title, lesson_id, max_points, due_at").in("lesson_id", lessonIds);
      const aIds = (assignments ?? []).map((a: any) => a.id);
      let subs: any[] = [];
      if (user && aIds.length) {
        const { data: s } = await supabase
          .from("assignment_submissions").select("assignment_id, grade, submitted_at, feedback")
          .eq("user_id", user.id).in("assignment_id", aIds);
        subs = s ?? [];
      }
      return { modules: modules ?? [], assignments: assignments ?? [], subs };
    },
  });

  const subByAssignment: Record<string, any> = {};
  for (const s of data?.subs ?? []) subByAssignment[s.assignment_id] = s;
  const assignmentsByLesson: Record<string, any[]> = {};
  for (const a of data?.assignments ?? []) {
    (assignmentsByLesson[a.lesson_id] ??= []).push(a);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={`Assignments · ${course?.title ?? "Course"}`} description="Submit and track every assignment for this course." />
      <Header />
      <main className="flex-1 container mx-auto px-5 sm:px-6 py-8 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to={courseHref(course)}><ChevronLeft className="h-4 w-4 mr-1" /> Back to course</Link>
        </Button>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileCheck2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Assignments</h1>
            <p className="text-sm text-muted-foreground">{course?.title ?? "Loading course…"}</p>
          </div>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground mb-3">Sign in to view and submit assignments.</p>
            <Button asChild><Link to="/sign-in">Sign in</Link></Button>
          </div>
        ) : (isLoading || courseLoading) ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (data?.assignments ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No assignments are available for this course yet.
          </div>
        ) : (
          <div className="space-y-8">
            {(data?.modules ?? []).map((m: any) => {
              const lessons = (m.lessons ?? []).filter((l: any) => assignmentsByLesson[l.id]?.length);
              if (!lessons.length) return null;
              return (
                <section key={m.id} className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{m.title}</h2>
                  {lessons.sort((a: any, b: any) => a.order_index - b.order_index).map((l: any) => {
                    const items = assignmentsByLesson[l.id] ?? [];
                    const graded = items.filter((a) => subByAssignment[a.id]?.grade != null).length;
                    const submitted = items.filter((a) => subByAssignment[a.id]).length;
                    return (
                      <div key={l.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{l.title}</p>
                          <div className="flex items-center gap-2 text-xs">
                            {graded > 0 && <Badge>{graded} graded</Badge>}
                            {submitted - graded > 0 && <Badge variant="secondary">{submitted - graded} submitted</Badge>}
                            {items.length - submitted > 0 && <Badge variant="outline">{items.length - submitted} pending</Badge>}
                          </div>
                        </div>
                        <AssignmentPanel lessonId={l.id} />
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}