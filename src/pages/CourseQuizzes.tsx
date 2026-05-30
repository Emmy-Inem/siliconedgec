import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LessonQuiz } from "@/components/LessonQuiz";
import { useCourse } from "@/hooks/useCourses";
import { ClipboardCheck, ChevronLeft, Loader2, Trophy } from "lucide-react";
import { useState } from "react";
import { courseHref } from "@/lib/course-url";
import { SEO } from "@/components/SEO";

export default function CourseQuizzes() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: course, isLoading: courseLoading } = useCourse(id);
  const courseId = course?.id;
  const [openQuizLessonId, setOpenQuizLessonId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["course-quizzes", courseId, user?.id],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: modules } = await supabase
        .from("modules").select("id, title, order_index, lessons:lessons(id, title, order_index)")
        .eq("course_id", courseId!).order("order_index");
      const lessonIds = (modules ?? []).flatMap((m: any) => (m.lessons ?? []).map((l: any) => l.id));
      if (!lessonIds.length) return { modules: modules ?? [], quizzes: [], attempts: [] };
      const { data: quizzes } = await supabase
        .from("quizzes").select("id, title, passing_score, lesson_id").in("lesson_id", lessonIds);
      const quizIds = (quizzes ?? []).map((q: any) => q.id);
      let attempts: any[] = [];
      if (user && quizIds.length) {
        const { data: a } = await supabase
          .from("quiz_attempts").select("quiz_id, score, completed_at")
          .eq("user_id", user.id).in("quiz_id", quizIds)
          .order("completed_at", { ascending: false });
        attempts = a ?? [];
      }
      return { modules: modules ?? [], quizzes: quizzes ?? [], attempts };
    },
  });

  const bestByQuiz: Record<string, number> = {};
  for (const a of data?.attempts ?? []) {
    bestByQuiz[a.quiz_id] = Math.max(bestByQuiz[a.quiz_id] ?? 0, a.score ?? 0);
  }

  const quizByLesson: Record<string, any> = {};
  for (const q of data?.quizzes ?? []) quizByLesson[q.lesson_id] = q;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={`Quizzes · ${course?.title ?? "Course"}`} description="Practice every lesson quiz and track your scores." noindex />
      <Header />
      <main className="flex-1 container mx-auto px-5 sm:px-6 py-8 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to={courseHref(course)}><ChevronLeft className="h-4 w-4 mr-1" /> Back to course</Link>
        </Button>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Quizzes</h1>
            <p className="text-sm text-muted-foreground">{course?.title ?? "Loading course…"}</p>
          </div>
        </div>

        {(isLoading || courseLoading) ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (data?.quizzes ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No quizzes are available for this course yet.
          </div>
        ) : (
          <div className="space-y-6">
            {(data?.modules ?? []).map((m: any) => {
              const lessons = (m.lessons ?? []).filter((l: any) => quizByLesson[l.id]);
              if (!lessons.length) return null;
              return (
                <section key={m.id} className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{m.title}</h2>
                  <div className="rounded-2xl border border-border divide-y divide-border bg-card">
                    {lessons.sort((a: any, b: any) => a.order_index - b.order_index).map((l: any) => {
                      const q = quizByLesson[l.id];
                      const best = bestByQuiz[q.id];
                      const passed = best != null && best >= q.passing_score;
                      const isOpen = openQuizLessonId === l.id;
                      return (
                        <div key={l.id} className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{q.title || l.title}</p>
                              <p className="text-xs text-muted-foreground truncate">Lesson · {l.title}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {best != null && (
                                <Badge variant={passed ? "default" : "secondary"} className="gap-1">
                                  {passed && <Trophy className="h-3 w-3" />} {best}%
                                </Badge>
                              )}
                              <Button size="sm" variant={isOpen ? "outline" : "default"} onClick={() => setOpenQuizLessonId(isOpen ? null : l.id)}>
                                {isOpen ? "Hide" : best != null ? "Retake" : "Start quiz"}
                              </Button>
                            </div>
                          </div>
                          {isOpen && user && <LessonQuiz lessonId={l.id} />}
                          {isOpen && !user && (
                            <p className="text-sm text-muted-foreground">
                              <Link to="/sign-in" className="text-primary underline">Sign in</Link> to take this quiz.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
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