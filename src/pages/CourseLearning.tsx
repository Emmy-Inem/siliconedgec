import { useState, useEffect, useMemo } from "react";
import { useParams, Link, Navigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Play, FileText, Lock, BookOpen, Download, Paperclip } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LiveClassesTab } from "@/components/LiveClassesTab";
import { LessonQuiz } from "@/components/LessonQuiz";
import { usePublicAccessMode } from "@/hooks/usePublicAccessMode";
import { LessonCompanion } from "@/components/ai/LessonCompanion";
import { LessonNotes } from "@/components/ai/LessonNotes";
import { courseHref, courseSectionHref } from "@/lib/course-url";

export default function CourseLearning() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { data: publicAccess } = usePublicAccessMode();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const routeLooksLikeUuid = !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Fetch course with modules and lessons
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course-learn", id],
    queryFn: async () => {
      if (!id) return null;
      const courseColumn = routeLooksLikeUuid ? "id" : "slug";
      const { data: courseData } = await supabase
        .from("courses")
        .select("id, slug, title, description")
        .eq(courseColumn, id)
        .maybeSingle();
      if (!courseData) return null;

      const { data: modules } = await supabase
        .from("modules")
        .select("id, title, order_index")
        .eq("course_id", courseData.id)
        .order("order_index");

      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title, duration, content_url, content_type, module_id, order_index")
        .in("module_id", (modules ?? []).map((m) => m.id))
        .order("order_index");

      return {
        ...courseData,
        modules: (modules ?? []).map((m) => ({
          ...m,
          lessons: (lessons ?? []).filter((l) => l.module_id === m.id),
        })),
      };
    },
    enabled: !!id,
  });

  const courseId = course?.id;
  const hasAdminAccess = !!user && isAdmin;

  const { data: enrollment, isLoading: enrollLoading } = useQuery({
    queryKey: ["enrollment-check", courseId, user?.id],
    queryFn: async () => {
      if (!user || !courseId) return null;
      const { data } = await supabase
        .from("enrollments")
        .select("id, course_id, user_id, payment_status")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!courseId && !hasAdminAccess,
  });

  // Fetch lesson progress
  const { data: progress } = useQuery({
    queryKey: ["lesson-progress", id, user?.id, course?.modules?.length ?? 0],
    enabled: !!user && !!course?.modules?.length,
    queryFn: async () => {
      if (!user) return [];
      const allLessonIds = course?.modules?.flatMap((m: any) => m.lessons.map((l: any) => l.id)) ?? [];
      if (!allLessonIds.length) return [];
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, is_completed")
        .eq("user_id", user.id)
        .in("lesson_id", allLessonIds);
      return data ?? [];
    },
  });

  // Fetch downloadable resources for current lesson
  const { data: resources = [] } = useQuery({
    queryKey: ["lesson-resources-student", selectedLessonId],
    queryFn: async () => {
      if (!selectedLessonId) return [];
      const { data } = await supabase
        .from("lesson_resources")
        .select("id, file_name, file_url, file_size, file_type")
        .eq("lesson_id", selectedLessonId)
        .order("order_index");
      return data ?? [];
    },
    enabled: !!selectedLessonId,
  });

  const allLessons = course?.modules?.flatMap((m: any) => m.lessons) ?? [];
  const currentLesson = allLessons.find((l: any) => l.id === selectedLessonId) ?? allLessons[0];
  const currentIndex = allLessons.findIndex((l: any) => l.id === currentLesson?.id);
  const completedIds = new Set((progress ?? []).filter((p: any) => p.is_completed).map((p: any) => p.lesson_id));

  useEffect(() => {
    if (selectedLessonId || !allLessons.length) return;
    const fromUrl = searchParams.get("lesson");
    const target = fromUrl && allLessons.some((l: any) => l.id === fromUrl) ? fromUrl : allLessons[0].id;
    setSelectedLessonId(target);
  }, [allLessons, selectedLessonId, searchParams]);

  // Keep URL in sync so lessons are deep-linkable / shareable.
  useEffect(() => {
    if (!selectedLessonId) return;
    if (searchParams.get("lesson") === selectedLessonId) return;
    const next = new URLSearchParams(searchParams);
    next.set("lesson", selectedLessonId);
    setSearchParams(next, { replace: true });
  }, [selectedLessonId, searchParams, setSearchParams]);

  const canAccessCourse = useMemo(() => {
    if (publicAccess) return true;
    if (!user) return false;
    if (hasAdminAccess) return true;
    if (!enrollment) return false;
    const paid = ["paid","success","completed","confirmed"];
    return paid.includes(String(enrollment.payment_status ?? "").toLowerCase());
  }, [publicAccess, user, hasAdminAccess, enrollment]);

  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) return;
      const { error } = await supabase.from("lesson_progress").upsert(
        { lesson_id: lessonId, user_id: user.id, is_completed: true, completed_at: new Date().toISOString() },
        { onConflict: "lesson_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
      toast({ title: "Lesson marked as complete!" });
      // Audit user activity for completion analytics
      try {
        const lesson = allLessons.find((l) => l.id === selectedLessonId);
        import("@/lib/user-activity").then(({ logUserActivity }) =>
          logUserActivity({
            user_id: user?.id ?? null,
            action: "lesson_complete",
            entity_type: "lesson",
            entity_id: selectedLessonId ?? undefined,
            metadata: { course_id: id, title: lesson?.title },
          })
        );
      } catch {}
    },
  });

  if (authLoading || courseLoading || (user && !hasAdminAccess && !publicAccess && enrollLoading)) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (!user && !publicAccess) return <Navigate to="/sign-in" replace />;
  if (!canAccessCourse) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-20 text-center">
        <Lock className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="font-heading text-2xl font-bold mb-2">Not Enrolled</h1>
        <p className="text-muted-foreground mb-6">You need to enroll in this course to access lessons.</p>
        <Button asChild><Link to={courseHref(course ?? (id ? { id, slug: routeLooksLikeUuid ? null : id } : null))}>View Course</Link></Button>
      </div>
    </div>
  );

  const completedCount = completedIds.size;
  const totalLessons = allLessons.length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-4 shrink-0">
        <Link to={courseHref(course ?? (id ? { id, slug: routeLooksLikeUuid ? null : id } : null))} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading font-semibold text-sm truncate flex-1">{course?.title}</h1>
        <nav className="hidden sm:flex items-center gap-1 text-xs">
          <Link to={courseSectionHref(course, "quizzes")} className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Quizzes</Link>
          <Link to={courseSectionHref(course, "assignments")} className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Assignments</Link>
          <Link to={courseSectionHref(course, "related")} className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Related</Link>
        </nav>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{progressPct}% complete</span>
          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - modules & lessons */}
        <aside className="w-72 border-r border-border bg-card overflow-y-auto shrink-0 hidden md:block">
          <div className="p-4 space-y-4">
            {course?.modules?.map((mod: any) => (
              <div key={mod.id}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-2">
                  {mod.title}
                </p>
                <div className="space-y-0.5">
                  {mod.lessons.map((lesson: any) => {
                    const isComplete = completedIds.has(lesson.id);
                    const isActive = lesson.id === currentLesson?.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all",
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate flex-1">{lesson.title}</span>
                        {lesson.duration && <span className="text-[10px] text-muted-foreground/60">{lesson.duration}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentLesson ? (
            <motion.div
              key={currentLesson.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div>
                <h2 className="font-heading text-xl font-bold mb-1">{currentLesson.title}</h2>
                {currentLesson.duration && (
                  <p className="text-sm text-muted-foreground">{currentLesson.duration}</p>
                )}
              </div>

              {/* Video player placeholder */}
              {currentLesson.content_url ? (
                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  <video
                    src={currentLesson.content_url}
                    controls
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-xl bg-muted/30 border border-border flex flex-col items-center justify-center">
                  <Play className="h-12 w-12 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No content uploaded yet</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex <= 0}
                  onClick={() => setSelectedLessonId(allLessons[currentIndex - 1]?.id)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>

                <Button
                  variant={completedIds.has(currentLesson.id) ? "outline" : "default"}
                  size="sm"
                  onClick={() => markComplete.mutate(currentLesson.id)}
                  disabled={completedIds.has(currentLesson.id)}
                >
                  {completedIds.has(currentLesson.id) ? (
                    <><CheckCircle2 className="h-4 w-4 mr-1 text-green-500" /> Completed</>
                  ) : (
                    "Mark as Complete"
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex >= allLessons.length - 1}
                  onClick={() => setSelectedLessonId(allLessons[currentIndex + 1]?.id)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Resources */}
              {resources.length > 0 && (
                <div className="pt-6 border-t border-border">
                  <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-primary" /> Lesson Resources
                  </h3>
                  <ul className="space-y-2">
                    {resources.map((r: any) => (
                      <li key={r.id}>
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={r.file_name}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors group"
                        >
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm flex-1 truncate">{r.file_name}</span>
                          <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quiz for this lesson */}
              <div className="pt-6 border-t border-border">
                <LessonQuiz
                  lessonId={currentLesson.id}
                  onPass={() => markComplete.mutate(currentLesson.id)}
                />
              </div>

              {/* Personal notes */}
              <LessonNotes lessonId={currentLesson.id} />
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No lessons available for this course yet.</p>
            </div>
          )}

          {/* Live Classes section */}
          {id && (
            <div className="max-w-3xl mx-auto mt-10 pt-6 border-t border-border">
              <h3 className="font-heading font-semibold text-sm mb-4">Live Sessions</h3>
              <LiveClassesTab courseId={courseId ?? id} />
            </div>
          )}
        </main>
      </div>
      <LessonCompanion lessonId={currentLesson?.id} lessonTitle={currentLesson?.title} courseId={courseId ?? id} />
    </div>
  );
}
