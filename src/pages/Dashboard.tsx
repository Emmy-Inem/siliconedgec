import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Award, Clock, Download, TrendingUp, GraduationCap, Bookmark, Trash2, Briefcase, ExternalLink, Calendar, Video } from "lucide-react";
import { motion } from "framer-motion";
import { formatNaira } from "@/lib/format-currency";
import { LiveClassCalendar } from "@/components/LiveClassCalendar";
import { buildIcsFile, downloadIcs, googleCalendarUrl } from "@/lib/ics";
import { GoogleCalendarConnect } from "@/components/GoogleCalendarConnect";
import { ProfileSettings } from "@/components/ProfileSettings";
import { Receipts } from "@/components/Receipts";
import { NextStepCard } from "@/components/ai/NextStepCard";
import { CareerCoachCard } from "@/components/ai/CareerCoachCard";
import { LearningAnalyticsCard } from "@/components/LearningAnalyticsCard";
import { useHasPublishedJobs } from "@/hooks/useHasPublishedJobs";
import { Settings, MessageCircle, Star } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePublicAccessMode } from "@/hooks/usePublicAccessMode";
import { getWhatsAppCommunityUrl } from "@/lib/whatsapp";
import { courseHref, courseLearnHref } from "@/lib/course-url";

interface EnrolledCourse {
  id: string;
  course_id: string;
  progress_percentage: number;
  is_completed: boolean;
  payment_status: string;
  created_at: string;
  last_lesson_id?: string | null;
  course: {
    id: string;
    slug?: string | null;
    title: string;
    thumbnail_url: string | null;
    category: string;
    difficulty: string;
    duration_hours: number;
    price: number;
  };
}

interface BookmarkedCourse {
  id: string;
  course_id: string;
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    category: string;
    price: number;
  };
}

interface JobApplicationRow {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
  job: { id: string; title: string; company: string; location: string | null } | null;
}

interface LiveClassRow {
  id: string;
  course_id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string;
  meeting_provider: string;
  status: string;
  instructor_name?: string | null;
}

export default function Dashboard() {
  const { user, loading, isAdmin } = useAuth();
  const { data: siteSettings } = useSiteSettings();
  const { data: publicAccess } = usePublicAccessMode();
  const { data: hasJobs } = useHasPublishedJobs();
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedCourse[]>([]);
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClassRow[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [webinarRegCourseIds, setWebinarRegCourseIds] = useState<Set<string>>(new Set());
  // course_id -> { done, total } for compact card indicator
  const [lessonStats, setLessonStats] = useState<Record<string, { done: number; total: number }>>({});

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [enrollRes, profileRes, bookmarkRes, appsRes, webinarRegRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("id, course_id, progress_percentage, is_completed, payment_status, created_at, last_lesson_id, course:courses(id, slug, title, thumbnail_url, category, difficulty, duration_hours, price)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("bookmarks")
          .select("id, course_id, course:courses(id, title, thumbnail_url, category, price)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("job_applications")
          .select("id, job_id, status, created_at, job:jobs(id, title, company, location)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        (supabase.from("course_registrations") as any)
          .select("course_id")
          .eq("user_id", user.id)
          .eq("registration_type", "webinar"),
      ]);

      if (enrollRes.data) {
        setEnrollments(
          (enrollRes.data as any[]).map((e) => ({
            ...e,
            course: Array.isArray(e.course) ? e.course[0] : e.course,
          }))
        );
      }
      if (profileRes.data) setProfile(profileRes.data);
      if (bookmarkRes.data) {
        setBookmarks(
          (bookmarkRes.data as any[]).map((b) => ({
            ...b,
            course: Array.isArray(b.course) ? b.course[0] : b.course,
          }))
        );
      }
      if (appsRes.data) {
        setApplications(
          (appsRes.data as any[]).map((a) => ({
            ...a,
            job: Array.isArray(a.job) ? a.job[0] : a.job,
          }))
        );
      }
      if (webinarRegRes?.data) {
        setWebinarRegCourseIds(new Set((webinarRegRes.data as any[]).map((r) => r.course_id)));
      }
      // Load live classes for enrolled OR webinar-registered courses
      const enrolledIds = (enrollRes.data as any[] | null)?.map((e) => e.course_id) ?? [];
      const regIds = (webinarRegRes?.data as any[] | null)?.map((r) => r.course_id) ?? [];
      const courseIds = Array.from(new Set([...enrolledIds, ...regIds]));
      if (courseIds.length) {
        const { data: lcs, error: lcsError } = await supabase
          .from("live_classes")
          .select("*")
          .in("course_id", courseIds)
          .order("scheduled_at", { ascending: true });
        if (lcsError) throw lcsError;
        setLiveClasses(lcs ?? []);
      }

      // Per-course lesson stats (done/total) for the dashboard card indicator.
      if (enrolledIds.length) {
        const [modulesRes, progressRes] = await Promise.all([
          supabase.from("modules").select("id, course_id").in("course_id", enrolledIds),
          supabase
            .from("lesson_progress")
            .select("lesson_id, is_completed")
            .eq("user_id", user.id)
            .eq("is_completed", true),
        ]);
        const moduleIds = (modulesRes.data ?? []).map((m: any) => m.id);
        const moduleToCourse = new Map<string, string>(
          (modulesRes.data ?? []).map((m: any) => [m.id, m.course_id]),
        );
        const { data: lessonsRows } = moduleIds.length
          ? await supabase.from("lessons").select("id, module_id").in("module_id", moduleIds)
          : { data: [] as any[] };
        const completedSet = new Set(
          (progressRes.data ?? []).map((p: any) => p.lesson_id),
        );
        const stats: Record<string, { done: number; total: number }> = {};
        for (const cid of enrolledIds) stats[cid] = { done: 0, total: 0 };
        for (const l of (lessonsRows ?? []) as any[]) {
          const cid = moduleToCourse.get(l.module_id);
          if (!cid || !stats[cid]) continue;
          stats[cid].total += 1;
          if (completedSet.has(l.id)) stats[cid].done += 1;
        }
        setLessonStats(stats);
      }

      setFetching(false);
    };

    fetchData();
  }, [user]);

  const removeBookmark = async (bookmarkId: string) => {
    await supabase.from("bookmarks").delete().eq("id", bookmarkId);
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
  };

  if (loading) return null;
  if (!user && !publicAccess) return <Navigate to="/sign-in" replace />;

  const completed = enrollments.filter((e) => e.is_completed);
  const isWebinar = (e: EnrolledCourse) =>
    (e.course?.price ?? 0) === 0 ||
    e.payment_status === "free" ||
    webinarRegCourseIds.has(e.course_id) ||
    (e.course?.title ?? "").toUpperCase().startsWith("FREE");
  const webinars = enrollments.filter((e) => !e.is_completed && isWebinar(e));
  const inProgress = enrollments.filter((e) => !e.is_completed && !isWebinar(e));
  const avgProgress =
    enrollments.length > 0
      ? Math.round(enrollments.reduce((s, e) => s + (e.progress_percentage ?? 0), 0) / enrollments.length)
      : 0;

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Student";
  const whatsappUrl = getWhatsAppCommunityUrl(siteSettings);
  const nextLiveClassFor = (courseId: string) =>
    liveClasses
      .filter((lc) => lc.course_id === courseId && new Date(lc.scheduled_at) >= new Date())
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-hero gradient-mesh pt-28 pb-14 relative overflow-hidden">
        <div className="noise-overlay" />
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-end">
            <div>
              <p className="text-hero-muted text-sm mb-3 uppercase tracking-[0.2em]">Student dashboard</p>
              <h1 className="font-heading text-3xl md:text-5xl font-bold text-hero mb-3 text-balance">Welcome back, {displayName}</h1>
              <p className="text-hero-muted text-lg max-w-2xl">Track your live sessions, continue coursework, review receipts, and keep your learning momentum in one place.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-hero-muted text-xs uppercase tracking-[0.18em] mb-1">Learning snapshot</p>
                  <p className="font-heading text-2xl text-hero">{avgProgress}% average progress</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-hero-muted text-[11px] uppercase tracking-[0.16em]">Courses</p>
                  <p className="mt-1 font-heading text-xl text-hero">{enrollments.length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-hero-muted text-[11px] uppercase tracking-[0.16em]">Live</p>
                  <p className="mt-1 font-heading text-xl text-hero">{liveClasses.filter((c) => new Date(c.scheduled_at).getTime() + c.duration_minutes * 60000 >= Date.now() && c.status !== "cancelled").length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-hero-muted text-[11px] uppercase tracking-[0.16em]">Certs</p>
                  <p className="mt-1 font-heading text-xl text-hero">{completed.length}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 page-transition">
        <div className="container mx-auto px-4">
          {user && (
            <div className="mb-10">
              <NextStepCard userId={user.id} />
              {hasJobs && <div className="mt-4"><CareerCoachCard /></div>}
            </div>
          )}

          {fetching ? (
            <div className="text-center py-20 text-muted-foreground">Loading your courses…</div>
          ) : (
              <Tabs defaultValue="courses" className="w-full space-y-6">
                <TabsList className="mb-2 w-full h-auto flex-wrap justify-start gap-1 rounded-2xl border border-border/70 bg-card/70 p-1.5 backdrop-blur">
                <TabsTrigger value="courses">My Courses ({enrollments.length})</TabsTrigger>
                <TabsTrigger value="bookmarks">Bookmarks ({bookmarks.length})</TabsTrigger>
                <TabsTrigger value="calendar">Live Classes ({liveClasses.length})</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="applications">Job Applications ({applications.length})</TabsTrigger>
                <TabsTrigger value="receipts">Receipts</TabsTrigger>
                <TabsTrigger value="profile"><Settings className="h-3.5 w-3.5 mr-1" />Profile</TabsTrigger>
              </TabsList>

              <TabsContent value="courses">
                {enrollments.length === 0 ? (
                  <div className="text-center py-20">
                    <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h2 className="font-heading text-xl font-semibold mb-2">No courses yet</h2>
                    <p className="text-muted-foreground mb-6">Start your learning journey today.</p>
                    <Button asChild><Link to="/courses">Browse Courses</Link></Button>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {webinars.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Star className="h-5 w-5 text-primary" />
                          <h2 className="font-heading text-xl font-bold">Upcoming Webinars</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {webinars.map((enroll, i) => {
                            const next = nextLiveClassFor(enroll.course_id);
                            return (
                              <motion.div key={enroll.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
                                <Card className="overflow-hidden border-primary/30 hover:shadow-lg transition-shadow">
                                  {enroll.course?.thumbnail_url && (
                                    <img src={enroll.course.thumbnail_url} alt={enroll.course.title} className="w-full h-40 object-cover" />
                                  )}
                                  <CardHeader className="pb-2">
                                    <Badge className="bg-primary/10 text-primary border-0 text-xs w-fit mb-1">
                                      <Star className="h-3 w-3 mr-1" /> Free webinar
                                    </Badge>
                                    <CardTitle className="text-base leading-snug">{enroll.course?.title}</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5" />
                                      {next
                                        ? new Date(next.scheduled_at).toLocaleString("en-US", {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                          })
                                        : "Schedule TBA — we'll notify you"}
                                    </p>
                                    <Button size="sm" className="w-full gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white" asChild>
                                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                                        <MessageCircle className="h-3.5 w-3.5" /> Join WhatsApp Community
                                      </a>
                                    </Button>
                                    <Button size="sm" variant="outline" className="w-full" asChild>
                                       <Link to={courseLearnHref({ id: enroll.course_id, slug: enroll.course?.slug ?? null })}>Open course hub</Link>
                                    </Button>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {inProgress.length > 0 && (
                      <div>
                        <h2 className="font-heading text-xl font-bold mb-4">In Progress</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {inProgress.map((enroll, i) => (
                            <motion.div key={enroll.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
                              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                                {enroll.course?.thumbnail_url && (
                                  <img src={enroll.course.thumbnail_url} alt={enroll.course.title} className="w-full h-40 object-cover" />
                                )}
                                <CardHeader className="pb-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-xs">{enroll.course?.category}</Badge>
                                    <Badge variant="outline" className="text-xs">{enroll.course?.difficulty}</Badge>
                                  </div>
                                  <CardTitle className="text-base leading-snug">{enroll.course?.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div>
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                      <span>Progress</span>
                                      <span>{enroll.progress_percentage ?? 0}%</span>
                                    </div>
                                    <Progress value={enroll.progress_percentage ?? 0} className="h-2" />
                                    {lessonStats[enroll.course_id]?.total > 0 && (
                                      <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                                        <BookOpen className="h-3 w-3" />
                                        {lessonStats[enroll.course_id].done}/{lessonStats[enroll.course_id].total} lessons completed
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {enroll.course?.duration_hours}h total
                                  </div>
                                  <Button size="sm" className="w-full" asChild>
                                     <Link
                                       to={
                                         enroll.last_lesson_id
                                           ? `${courseLearnHref({ id: enroll.course_id, slug: enroll.course?.slug ?? null })}?lesson=${enroll.last_lesson_id}`
                                           : courseLearnHref({ id: enroll.course_id, slug: enroll.course?.slug ?? null })
                                       }
                                     >
                                       {enroll.last_lesson_id ? "Resume where you left off" : "Continue Learning"}
                                     </Link>
                                  </Button>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {completed.length > 0 && (
                      <div>
                        <h2 className="font-heading text-xl font-bold mb-4">Completed — Certificates</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {completed.map((enroll, i) => (
                            <motion.div key={enroll.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
                              <Card className="overflow-hidden border-primary/20">
                                <CardHeader className="pb-2">
                                  <Badge className="bg-primary/10 text-primary text-xs border-0 w-fit">Completed</Badge>
                                  <CardTitle className="text-base leading-snug">{enroll.course?.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <Progress value={100} className="h-2" />
                                  {lessonStats[enroll.course_id]?.total > 0 && (
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                      <BookOpen className="h-3 w-3" />
                                      {lessonStats[enroll.course_id].total}/{lessonStats[enroll.course_id].total} lessons completed
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    Completed on {new Date(enroll.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                  </p>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" asChild>
                                      <Link to="/certificates?download=latest">
                                        <Download className="h-3.5 w-3.5" /> Certificate
                                      </Link>
                                    </Button>
                                    <Button size="sm" variant="ghost" asChild className="flex-1">
                                      <Link to={courseHref({ id: enroll.course_id, slug: enroll.course?.slug ?? null })}>Review</Link>
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bookmarks">
                {bookmarks.length === 0 ? (
                  <div className="text-center py-20">
                    <Bookmark className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h2 className="font-heading text-xl font-semibold mb-2">No bookmarks yet</h2>
                    <p className="text-muted-foreground mb-6">Save courses you're interested in for later.</p>
                    <Button asChild><Link to="/courses">Browse Courses</Link></Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookmarks.map((bm, i) => (
                      <motion.div key={bm.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                          {bm.course?.thumbnail_url && (
                            <img src={bm.course.thumbnail_url} alt={bm.course.title} className="w-full h-40 object-cover" />
                          )}
                          <CardHeader className="pb-2">
                            <Badge variant="secondary" className="text-xs w-fit">{bm.course?.category}</Badge>
                            <CardTitle className="text-base leading-snug">{bm.course?.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="font-heading font-bold text-primary">{formatNaira(bm.course?.price ?? 0)}</p>
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1" asChild>
                                <Link to={courseHref({ id: bm.course_id, slug: null })}>View Course</Link>
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => removeBookmark(bm.id)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="calendar">
                {isAdmin && (
                  <div className="mb-6">
                    <GoogleCalendarConnect />
                  </div>
                )}
                {liveClasses.length === 0 ? (
                  <div className="text-center py-20">
                    <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h2 className="font-heading text-xl font-semibold mb-2">No live classes scheduled</h2>
                    <p className="text-muted-foreground mb-6">Sessions for courses you've enrolled in or registered for will appear here.</p>
                    <Button asChild><Link to="/courses">Browse Courses</Link></Button>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3 space-y-3">
                      <h2 className="font-heading text-xl font-bold flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" /> Upcoming Sessions
                      </h2>
                      {(() => {
                        const now = Date.now();
                        const upcoming = [...liveClasses]
                          .filter((c) => new Date(c.scheduled_at).getTime() + c.duration_minutes * 60000 >= now && c.status !== "cancelled")
                          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
                        const past = [...liveClasses]
                          .filter((c) => new Date(c.scheduled_at).getTime() + c.duration_minutes * 60000 < now || c.status === "cancelled")
                          .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
                        const render = (c: LiveClassRow) => {
                          const dt = new Date(c.scheduled_at);
                          const startMs = dt.getTime();
                          const endMs = startMs + c.duration_minutes * 60000;
                          const isCancelled = c.status === "cancelled";
                          const isPast = now > endMs;
                          const isLive = !isCancelled && !isPast && now >= startMs && now <= endMs;
                          const canJoin = !isCancelled && !isPast && now >= startMs - 10 * 60 * 1000;
                          return (
                            <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {isCancelled ? <Badge variant="outline" className="text-xs">Cancelled</Badge>
                                    : isLive ? <Badge className="bg-red-500/10 text-red-600 border-0 text-xs">● Live now</Badge>
                                    : isPast ? <Badge variant="outline" className="text-xs">Past</Badge>
                                    : <Badge variant="secondary" className="text-xs">Upcoming</Badge>}
                                  <Badge variant="outline" className="text-xs uppercase">{c.meeting_provider}</Badge>
                                </div>
                                <p className="font-medium text-sm truncate">{c.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {dt.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })} · {c.duration_minutes}m
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {!isPast && !isCancelled && (
                                  <>
                                    <Button size="icon" variant="ghost" title="Download .ics"
                                      onClick={() => downloadIcs(`${c.title.replace(/[^\w]+/g, "-").toLowerCase()}.ics`,
                                        buildIcsFile({ uid: c.id, title: c.title, description: `Live class · ${c.meeting_provider}`, url: c.meeting_url, start: dt, durationMinutes: c.duration_minutes }))}>
                                      <Download className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" title="Add to Google Calendar" asChild>
                                      <a href={googleCalendarUrl({ title: c.title, description: `Live class · ${c.meeting_provider}`, url: c.meeting_url, start: dt, durationMinutes: c.duration_minutes })} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    </Button>
                                  </>
                                )}
                                <Button size="sm" disabled={!canJoin} asChild={canJoin} className="gap-1">
                                  {canJoin
                                    ? <a href={c.meeting_url} target="_blank" rel="noopener noreferrer"><Video className="h-3 w-3" /> Join</a>
                                    : <span>{isPast ? "Ended" : isCancelled ? "Cancelled" : "Not yet"}</span>}
                                </Button>
                              </div>
                            </div>
                          );
                        };
                        return (
                          <>
                            {upcoming.length === 0
                              ? <p className="text-sm text-muted-foreground py-4">No upcoming sessions. Check back soon.</p>
                              : upcoming.map(render)}
                            {past.length > 0 && (
                              <div className="pt-6">
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">Past sessions</h3>
                                <div className="space-y-3 opacity-70">{past.slice(0, 5).map(render)}</div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="lg:col-span-2">
                      <LiveClassCalendar classes={liveClasses as any} />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analytics">
                {user ? (
                  <LearningAnalyticsCard userId={user.id} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Sign in to see your learning analytics.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="applications">
                {applications.length === 0 ? (
                  <div className="text-center py-20">
                    <Briefcase className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h2 className="font-heading text-xl font-semibold mb-2">No applications yet</h2>
                    <p className="text-muted-foreground mb-6">Apply to open positions on our job board.</p>
                    <Button asChild><Link to="/jobs">Browse Jobs</Link></Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app, i) => {
                      const statusColor: Record<string, string> = {
                        submitted: "bg-blue-500/10 text-blue-600",
                        reviewing: "bg-amber-500/10 text-amber-600",
                        interview: "bg-primary/10 text-primary",
                        accepted: "bg-green-500/10 text-green-600",
                        rejected: "bg-red-500/10 text-red-600",
                      };
                      return (
                        <motion.div key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                          <Card>
                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Briefcase className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-heading font-semibold truncate">{app.job?.title ?? "Job removed"}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {app.job?.company}{app.job?.location ? ` · ${app.job.location}` : ""}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                  Applied {new Date(app.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`${statusColor[app.status] ?? "bg-muted"} border-0 capitalize`}>{app.status}</Badge>
                                {app.job && (
                                  <Button size="sm" variant="ghost" asChild>
                                    <Link to={`/jobs/${app.job_id}`}><ExternalLink className="h-4 w-4" /></Link>
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="receipts">
                <Receipts />
              </TabsContent>

              <TabsContent value="profile">
                <ProfileSettings />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </section>

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
