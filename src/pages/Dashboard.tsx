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
import { BookOpen, Award, Clock, Download, TrendingUp, GraduationCap, Bookmark, Trash2, Briefcase, ExternalLink, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { formatNaira } from "@/lib/format-currency";
import { LiveClassCalendar } from "@/components/LiveClassCalendar";
import { ProfileSettings } from "@/components/ProfileSettings";
import { Settings } from "lucide-react";

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

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedCourse[]>([]);
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [enrollRes, profileRes, bookmarkRes, appsRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("id, course_id, progress_percentage, is_completed, payment_status, created_at, course:courses(id, title, thumbnail_url, category, difficulty, duration_hours)")
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
      // Load live classes for enrolled courses
      const enrolledIds = (enrollRes.data as any[] | null)?.map((e) => e.course_id) ?? [];
      if (enrolledIds.length) {
        const { data: lcs } = await supabase
          .from("live_classes")
          .select("*")
          .in("course_id", enrolledIds)
          .order("scheduled_at", { ascending: true });
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
  if (!user) return <Navigate to="/sign-in" replace />;

  const completed = enrollments.filter((e) => e.is_completed);
  const inProgress = enrollments.filter((e) => !e.is_completed);
  const avgProgress =
    enrollments.length > 0
      ? Math.round(enrollments.reduce((s, e) => s + (e.progress_percentage ?? 0), 0) / enrollments.length)
      : 0;

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Student";

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
              <TabsList className="mb-6">
                <TabsTrigger value="courses">My Courses ({enrollments.length})</TabsTrigger>
                <TabsTrigger value="bookmarks">Bookmarks ({bookmarks.length})</TabsTrigger>
                <TabsTrigger value="calendar">Calendar ({liveClasses.length})</TabsTrigger>
                <TabsTrigger value="applications">Job Applications ({applications.length})</TabsTrigger>
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
                    <p className="text-muted-foreground mb-6">Live classes for your enrolled courses will appear here.</p>
                    <Button asChild><Link to="/courses">Browse Courses</Link></Button>
                  </div>
                ) : (
                  <LiveClassCalendar classes={liveClasses as any} />
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
                        interview: "bg-purple-500/10 text-purple-600",
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
            </Tabs>
          )}
        </div>
      </section>

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
