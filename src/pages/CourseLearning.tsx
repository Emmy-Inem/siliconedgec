import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, Navigate, useSearchParams, useNavigate } from "react-router-dom";
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
import { AssignmentPanel } from "@/components/learning/AssignmentPanel";
import { LessonDiscussion } from "@/components/learning/LessonDiscussion";
import { DownloadAllButton } from "@/components/learning/DownloadAllButton";
import { EnhancedVideoPlayer, type EnhancedVideoPlayerHandle } from "@/components/learning/EnhancedVideoPlayer";
import { usePublicAccessMode } from "@/hooks/usePublicAccessMode";
import { LessonCompanion } from "@/components/ai/LessonCompanion";
import { LessonNotes } from "@/components/ai/LessonNotes";
import { CohortAccessButton } from "@/components/CohortAccessButton";
import { LessonApprovalPanel } from "@/components/learning/LessonApprovalPanel";
import { courseHref, courseSectionHref } from "@/lib/course-url";
import {
  isLessonUnlocked as isLessonUnlockedHelper,
  findResumeLesson,
  isCourseComplete,
} from "@/lib/lesson-progress";

export default function CourseLearning() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, adminRole, loading: authLoading } = useAuth();
  const { data: publicAccess } = usePublicAccessMode();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeLessonRef = useRef<HTMLButtonElement | null>(null);
  const playerRef = useRef<EnhancedVideoPlayerHandle | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const isStaffApprover =
    hasAdminAccess &&
    (adminRole === "admin" || adminRole === "moderator" || adminRole === "instructor");

  const { data: enrollment, isLoading: enrollLoading } = useQuery({
    queryKey: ["enrollment-check", courseId, user?.id],
    queryFn: async () => {
      if (!user || !courseId) return null;
      const { data } = await supabase
        .from("enrollments")
        .select("id, course_id, user_id, payment_status, last_lesson_id, resume_position_seconds")
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

  // Fetch which lessons an instructor has explicitly approved for this student.
  const { data: approvals = [] } = useQuery({
    queryKey: ["lesson-approvals", id, user?.id, course?.modules?.length ?? 0],
    enabled: !!user && !!course?.modules?.length,
    queryFn: async () => {
      if (!user) return [];
      const allLessonIds = course?.modules?.flatMap((m: any) => m.lessons.map((l: any) => l.id)) ?? [];
      if (!allLessonIds.length) return [];
      const { data } = await (supabase as any)
        .from("lesson_unlocks")
        .select("lesson_id")
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

  // All resources for the course (for the bulk-download button).
  const { data: courseResources = [] } = useQuery({
    queryKey: ["course-resources-all", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data } = await supabase
        .from("lesson_resources")
        .select("id, file_name, file_url")
        .eq("course_id", courseId);
      return data ?? [];
    },
    enabled: !!courseId,
  });

  const allLessons = course?.modules?.flatMap((m: any) => m.lessons) ?? [];
  const completedIds = new Set((progress ?? []).filter((p: any) => p.is_completed).map((p: any) => p.lesson_id));
  const approvedIds = new Set((approvals ?? []).map((a: any) => a.lesson_id));
  const hasPaidEnrollment = ["paid", "success", "completed", "confirmed"].includes(
    String(enrollment?.payment_status ?? "").toLowerCase(),
  );

  const unlockCtx = {
    lessons: allLessons as { id: string }[],
    completed: completedIds as Set<string>,
    isStaff: hasAdminAccess,
    hasPaid: hasPaidEnrollment,
    approved: approvedIds as Set<string>,
  };
  const isLessonUnlocked = (lessonId: string) => isLessonUnlockedHelper(lessonId, unlockCtx);
  const lastUnlockedLesson = findResumeLesson(unlockCtx);

  const requestedLesson = allLessons.find((l: any) => l.id === selectedLessonId);
  const currentLesson = requestedLesson && isLessonUnlocked(requestedLesson.id)
    ? requestedLesson
    : (lastUnlockedLesson ?? allLessons[0]);
  const currentIndex = allLessons.findIndex((l: any) => l.id === currentLesson?.id);

  // Smooth-scroll the sidebar to keep the active lesson visible after deep-link nav.
  useEffect(() => {
    activeLessonRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentLesson?.id]);

  useEffect(() => {
    if (selectedLessonId || !allLessons.length) return;
    const fromUrl = searchParams.get("lesson");
    // Priority: URL ?lesson= → enrollment.last_lesson_id → furthest unlocked lesson.
    const requestedId = fromUrl ?? (enrollment as any)?.last_lesson_id ?? null;
    const requested = requestedId && allLessons.find((l: any) => l.id === requestedId);
    const target =
      requested && isLessonUnlocked(requested.id)
        ? requested.id
        : (lastUnlockedLesson?.id ?? allLessons[0].id);
    setSelectedLessonId(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLessons.length, selectedLessonId, searchParams, completedIds.size, hasAdminAccess, hasPaidEnrollment]);

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
    return hasPaidEnrollment;
  }, [publicAccess, user, hasAdminAccess, enrollment, hasPaidEnrollment]);

  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) return;
      const { error } = await supabase.from("lesson_progress").upsert(
        { lesson_id: lessonId, user_id: user.id, is_completed: true, completed_at: new Date().toISOString() },
        { onConflict: "lesson_id,user_id" }
      );
      if (error) throw error;
      return lessonId;
    },
    onSuccess: (completedLessonId) => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
      toast({ title: "Lesson marked as complete!" });
      // If this completion finishes the course, auto-redirect to the
      // certificate page with a download flag so the PDF is generated
      // and downloaded immediately.
      const nextCompleted = new Set(completedIds);
      if (completedLessonId) nextCompleted.add(completedLessonId);
      if (
        isCourseComplete({
          lessons: allLessons as { id: string }[],
          completed: nextCompleted,
          hasPaid: true,
        })
      ) {
        toast({
          title: "Course complete! 🎓",
          description: "Generating your certificate…",
        });
        setTimeout(() => navigate("/certificates?download=latest"), 800);
      }
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
    onError: (e: any) => {
      toast({
        title: "Cannot mark complete yet",
        description: e?.message?.includes("previous lesson")
          ? "Finish the previous lesson first to unlock this one."
          : e?.message ?? "Please try again.",
        variant: "destructive",
      });
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
        <Link
          to={courseHref(course ?? (id ? { id, slug: routeLooksLikeUuid ? null : id } : null))}
          className="text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded"
          aria-label="Back to course overview"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
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
            {course?.modules?.map((mod: any) => {
              const modLessons = mod.lessons ?? [];
              const modDone = modLessons.filter((l: any) => completedIds.has(l.id)).length;
              const modPct = modLessons.length ? Math.round((modDone / modLessons.length) * 100) : 0;
              return (
              <div key={mod.id}>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {mod.title}
                  </p>
                  <span className="text-[10px] tabular-nums text-muted-foreground/60">
                    {modDone}/{modLessons.length}
                  </span>
                </div>
                <div className="mx-2 mb-2 h-1 rounded-full bg-muted overflow-hidden" aria-hidden>
                  <div
                    className="h-full bg-primary/70 transition-all"
                    style={{ width: `${modPct}%` }}
                  />
                </div>
                <div className="space-y-0.5">
                  {modLessons.map((lesson: any) => {
                    const isComplete = completedIds.has(lesson.id);
                    const isActive = lesson.id === currentLesson?.id;
                    const unlocked = isLessonUnlocked(lesson.id);
                    const isNextUp =
                      !isComplete &&
                      unlocked &&
                      lastUnlockedLesson?.id === lesson.id &&
                      !isActive;
                    return (
                      <button
                        key={lesson.id}
                        ref={isActive ? activeLessonRef : undefined}
                        onClick={() => unlocked && setSelectedLessonId(lesson.id)}
                        disabled={!unlocked}
                        title={unlocked ? undefined : "Complete the previous lesson to unlock"}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : unlocked
                              ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                              : "text-muted-foreground/50 cursor-not-allowed"
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : !unlocked ? (
                          <Lock className="h-4 w-4 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate flex-1">{lesson.title}</span>
                        {isNextUp && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary shrink-0">
                            Next
                          </span>
                        )}
                        {lesson.duration && <span className="text-[10px] text-muted-foreground/60">{lesson.duration}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );})}
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
                <EnhancedVideoPlayer
                  ref={playerRef}
                  src={currentLesson.content_url}
                  onLoadedMetadata={() => {
                    // Resume playback for the lesson that was active when the
                    // student left off. Other lessons start at 0.
                    const v = playerRef.current?.el();
                    const isResumeTarget =
                      !!user &&
                      !!v &&
                      (enrollment as any)?.last_lesson_id === currentLesson.id &&
                      Number((enrollment as any)?.resume_position_seconds ?? 0) > 0;
                    if (isResumeTarget && v) {
                      try {
                        v.currentTime = Number(
                          (enrollment as any).resume_position_seconds,
                        );
                      } catch {}
                    }
                  }}
                  onTimeUpdate={(e) => {
                      if (!user || !courseId) return;
                      const t = Math.floor((e.currentTarget as HTMLVideoElement).currentTime || 0);
                      if (saveTimer.current) clearTimeout(saveTimer.current);
                      saveTimer.current = setTimeout(() => {
                        void supabase
                          .from("enrollments")
                          .update({
                            last_lesson_id: currentLesson.id,
                            resume_position_seconds: t,
                            last_seen_at: new Date().toISOString(),
                          })
                          .eq("user_id", user.id)
                          .eq("course_id", courseId);
                      }, 3000);
                  }}
                  onEnded={() => {
                    if (!completedIds.has(currentLesson.id)) markComplete.mutate(currentLesson.id);
                  }}
                />
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
                  disabled={completedIds.has(currentLesson.id) || !isLessonUnlocked(currentLesson.id)}
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
                  disabled={
                    currentIndex >= allLessons.length - 1 ||
                    !isLessonUnlocked(allLessons[currentIndex + 1]?.id)
                  }
                  onClick={() => {
                    const next = allLessons[currentIndex + 1];
                    if (next && isLessonUnlocked(next.id)) setSelectedLessonId(next.id);
                  }}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {isStaffApprover && courseId && currentLesson && (
                <div className="pt-6 border-t border-border">
                  <LessonApprovalPanel
                    courseId={courseId}
                    currentLessonId={currentLesson.id}
                    nextLessonId={allLessons[currentIndex + 1]?.id ?? null}
                  />
                </div>
              )}
              {/* Resources */}
              {resources.length > 0 && (
                <div className="pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-primary" /> Lesson Resources
                    </h3>
                    {courseResources.length > 1 && (
                      <DownloadAllButton
                        courseTitle={course?.title ?? "course"}
                        resources={courseResources as any}
                      />
                    )}
                  </div>
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

              {/* Assignments for this lesson */}
              <div className="pt-6 border-t border-border space-y-3">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Assignments
                </h3>
                <AssignmentPanel lessonId={currentLesson.id} />
              </div>

              {/* Threaded lesson discussion */}
              <div className="pt-6 border-t border-border">
                <LessonDiscussion lessonId={currentLesson.id} />
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
              <div className="mb-6"><CohortAccessButton courseId={courseId} /></div>
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
