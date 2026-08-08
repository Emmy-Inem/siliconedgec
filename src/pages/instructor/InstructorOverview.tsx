import { useOutletContext, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileCheck2,
  ClipboardList,
  MessagesSquare,
  CalendarClock,
  Loader2,
  GraduationCap,
  TrendingUp,
  Activity,
  Award,
} from "lucide-react";
import type { InstructorOutletContext } from "./InstructorLayout";
import { format } from "date-fns";

const db = supabase as any;

export default function InstructorOverview() {
  const { activeCohort, cohorts } = useOutletContext<InstructorOutletContext>();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["instructor-overview", activeCohort?.id, activeCohort?.course_id],
    enabled: !!activeCohort,
    queryFn: async () => {
      const courseId = activeCohort!.course_id;
      const cohortId = activeCohort!.id;

      const [membersRes, sessionsRes, postsRes] = await Promise.all([
        db.from("cohort_members").select("user_id", { count: "exact" }).eq("cohort_id", cohortId),
        db
          .from("cohort_sessions")
          .select("id, title, scheduled_at")
          .eq("cohort_id", cohortId)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at")
          .limit(3),
        db
          .from("cohort_posts")
          .select("id", { count: "exact", head: true })
          .eq("cohort_id", cohortId)
          .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()),
      ]);

      let ungraded = 0;
      let quizAttemptsWeek = 0;
      let unansweredQna = 0;
      let enrolled = 0;
      let completionRate = 0;
      let activeLearners7d = 0;
      let certificates = 0;
      if (courseId) {
        const { data: mods } = await db
          .from("modules")
          .select("id, lessons:lessons(id)")
          .eq("course_id", courseId);
        const lessonIds = (mods ?? []).flatMap((m: any) => (m.lessons ?? []).map((l: any) => l.id));
        if (lessonIds.length) {
          const { data: assigns } = await db
            .from("assignments")
            .select("id")
            .in("lesson_id", lessonIds);
          const aIds = (assigns ?? []).map((a: any) => a.id);
          if (aIds.length) {
            const { count } = await db
              .from("assignment_submissions")
              .select("id", { count: "exact", head: true })
              .in("assignment_id", aIds)
              .is("grade", null);
            ungraded = count ?? 0;
          }
          const { data: quizzes } = await db.from("quizzes").select("id").in("lesson_id", lessonIds);
          const qIds = (quizzes ?? []).map((q: any) => q.id);
          if (qIds.length) {
            const { count } = await db
              .from("quiz_attempts")
              .select("id", { count: "exact", head: true })
              .in("quiz_id", qIds)
              .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString());
            quizAttemptsWeek = count ?? 0;
          }
        }
        const { count: qnaCount } = await db
          .from("course_qna")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId)
          .or("answer.is.null,answer.eq.");
        unansweredQna = qnaCount ?? 0;

        // Admin-grade course health numbers instructors previously had to ask
        // an admin for: enrolment, completion, weekly activity, certificates.
        const [{ data: enrolRows }, { data: activeRows }, { count: certCount }] = await Promise.all([
          db.from("enrollments").select("user_id, progress, completed_at").eq("course_id", courseId),
          db
            .from("lesson_progress")
            .select("user_id")
            .eq("course_id", courseId)
            .gte("updated_at", new Date(Date.now() - 7 * 86400_000).toISOString()),
          db
            .from("certificates")
            .select("id", { count: "exact", head: true })
            .eq("course_id", courseId),
        ]);
        const rows = (enrolRows ?? []) as any[];
        enrolled = rows.length;
        const done = rows.filter((r) => r.completed_at || Number(r.progress ?? 0) >= 100).length;
        completionRate = enrolled ? Math.round((done / enrolled) * 100) : 0;
        activeLearners7d = new Set((activeRows ?? []).map((r: any) => r.user_id)).size;
        certificates = certCount ?? 0;
      }

      return {
        members: membersRes.count ?? 0,
        upcoming: sessionsRes.data ?? [],
        recentPosts: postsRes.count ?? 0,
        ungraded,
        quizAttemptsWeek,
        unansweredQna,
        enrolled,
        completionRate,
        activeLearners7d,
        certificates,
      };
    },
  });

  if (!cohorts.length) {
    return (
      <Card className="p-8 text-center">
        <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-heading font-semibold mb-1">You're not assigned to any cohort yet</h2>
        <p className="text-sm text-muted-foreground">
          Ask an admin to add you as an instructor on a cohort. You'll see students, assignments and quizzes here.
        </p>
      </Card>
    );
  }

  if (!activeCohort) return null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-widest">Active cohort</div>
        <h1 className="font-heading text-2xl font-bold">{activeCohort.name}</h1>
        {activeCohort.course_title && (
          <p className="text-sm text-muted-foreground">
            Course: {activeCohort.course_title}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Tile
              to="/instructor/assignments"
              icon={<FileCheck2 className="h-5 w-5" />}
              label="Ungraded submissions"
              value={stats?.ungraded ?? 0}
              hint="Waiting for your feedback"
              accent={stats && stats.ungraded > 0 ? "warn" : undefined}
            />
            <Tile
              to="/instructor/students"
              icon={<Users className="h-5 w-5" />}
              label="Students in cohort"
              value={stats?.members ?? 0}
              hint="Members you can support"
            />
            <Tile
              to="/instructor/quizzes"
              icon={<ClipboardList className="h-5 w-5" />}
              label="Quiz attempts (7d)"
              value={stats?.quizAttemptsWeek ?? 0}
              hint="Recent activity"
            />
            <Tile
              to="/instructor/cohort"
              icon={<MessagesSquare className="h-5 w-5" />}
              label="Recent posts (7d)"
              value={stats?.recentPosts ?? 0}
              hint="Cohort discussion"
            />
            <Tile
              to={`/admin/qna`}
              icon={<MessagesSquare className="h-5 w-5" />}
              label="Unanswered Q&A"
              value={stats?.unansweredQna ?? 0}
              hint="Course questions to answer"
              accent={stats && stats.unansweredQna > 0 ? "warn" : undefined}
            />
            <Tile
              to="/instructor/cohort"
              icon={<CalendarClock className="h-5 w-5" />}
              label="Upcoming sessions"
              value={stats?.upcoming.length ?? 0}
              hint="Next 7 days"
            />
          </div>

          {/* Course health — the admin-level numbers for the cohort's course */}
          <div>
            <h3 className="font-heading font-semibold text-sm mb-3">Course health</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Tile
                to="/instructor/students"
                icon={<Users className="h-5 w-5" />}
                label="Enrolled learners"
                value={stats?.enrolled ?? 0}
                hint="With access to the course"
              />
              <Tile
                to="/instructor/students"
                icon={<TrendingUp className="h-5 w-5" />}
                label="Completion rate"
                value={stats?.completionRate ?? 0}
                suffix="%"
                hint="Learners who finished"
              />
              <Tile
                to="/instructor/students"
                icon={<Activity className="h-5 w-5" />}
                label="Active learners (7d)"
                value={stats?.activeLearners7d ?? 0}
                hint="Opened or completed a lesson"
              />
              <Tile
                to="/instructor/students"
                icon={<Award className="h-5 w-5" />}
                label="Certificates issued"
                value={stats?.certificates ?? 0}
                hint="Verified completions"
              />
            </div>
          </div>

          {(stats?.upcoming ?? []).length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-semibold text-sm">Upcoming live sessions</h3>
              </div>
              <ul className="divide-y divide-border">
                {stats!.upcoming.map((s: any) => (
                  <li key={s.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{s.title}</span>
                    <Badge variant="outline" className="shrink-0">
                      {format(new Date(s.scheduled_at), "EEE d MMM · HH:mm")}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Tile({
  to,
  icon,
  label,
  value,
  hint,
  accent,
  suffix,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  accent?: "warn";
  suffix?: string;
}) {
  return (
    <Link to={to}>
      <Card
        className={`p-5 hover:border-primary/50 transition-colors ${
          accent === "warn" ? "border-amber-500/50 bg-amber-500/[0.03]" : ""
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
          <div className="text-2xl font-heading font-bold">{value}{suffix}</div>
        </div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </Card>
    </Link>
  );
}