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
import { ProfileSettings } from "@/components/ProfileSettings";
import { Receipts } from "@/components/Receipts";
import { Settings, MessageCircle, Sparkles } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePublicAccessMode } from "@/hooks/usePublicAccessMode";

const DEFAULT_WHATSAPP_COMMUNITY = "https://chat.whatsapp.com/Fk8RN2yDKS800vnIG8K98X?mode=gi_t";

interface EnrolledCourse {
  id: string;
  course_id: string;
  progress_percentage: number;
  is_completed: boolean;
  payment_status: string;
  created_at: string;
  course: {
    id: string;
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
  const { user, loading } = useAuth();
  const { data: siteSettings } = useSiteSettings();
  const { data: publicAccess } = usePublicAccessMode();
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedCourse[]>([]);
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClassRow[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [webinarRegCourseIds, setWebinarRegCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [enrollRes, profileRes, bookmarkRes, appsRes, webinarRegRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("id, course_id, progress_percentage, is_completed, payment_status, created_at, course:courses(id, title, thumbnail_url, category, difficulty, duration_hours, price)")
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
  const whatsappUrl = (siteSettings as any)?.whatsapp_community_url || DEFAULT_WHATSAPP_COMMUNITY;
  const nextLiveClassFor = (courseId: string) =>
    liveClasses
      .filter((lc) => lc.course_id === courseId && new Date(lc.scheduled_at) >= new Date())
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-hero pt-28 pb-14">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-hero-muted text-sm mb-1">Welcome back,</p>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-hero mb-2">{displayName}</h1>
            <p className="text-hero-muted text-lg">Track your learning progress and download certificates.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[
              { icon: BookOpen, label: "Enrolled", value: enrollments.length },
              { icon: TrendingUp, label: "Avg Progress", value: `${avgProgress}%` },
              { icon: Award, label: "Certificates", value: completed.length },
              { icon: Bookmark, label: "Bookmarks", value: bookmarks.length },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card>
                  <CardContent className="flex items-center gap-3 p-4 md:p-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-heading font-bold">{stat.value}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {fetching ? (
            <div className="text-center py-20 text-muted-foreground">Loading your courses…</div>
          ) : (
            <Tabs defaultValue="courses" className="w-full">
              <TabsList className="mb-6 w-full sm:w-auto h-auto flex-wrap justify-start gap-1">
                <TabsTrigger value="courses">My Courses ({enrollments.length})</TabsTrigger>
                <TabsTrigger value="bookmarks">Bookmarks ({bookmarks.length})</TabsTrigger>
                <TabsTrigger value="calendar">Live Classes ({liveClasses.length})</TabsTrigger>
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
                          <Sparkles className="h-5 w-5 text-primary" />
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
                                      <Sparkles className="h-3 w-3 mr-1" /> Free webinar
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
                                      <Link to={`/courses/${enroll.course_id}`}>Open Course</Link>
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
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {enroll.course?.duration_hours}h total
                                  </div>
                                  <Button size="sm" className="w-full" asChild>
                                    <Link to={`/courses/${enroll.course_id}`}>Continue Learning</Link>
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
                                  <p className="text-xs text-muted-foreground">
                                    Completed on {new Date(enroll.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                  </p>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="flex-1 gap-1.5">
                                      <Download className="h-3.5 w-3.5" /> Certificate
                                    </Button>
                                    <Button size="sm" variant="ghost" asChild className="flex-1">
                                      <Link to={`/courses/${enroll.course_id}`}>Review</Link>
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
                                <Link to={`/courses/${bm.course_id}`}>View Course</Link>
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
