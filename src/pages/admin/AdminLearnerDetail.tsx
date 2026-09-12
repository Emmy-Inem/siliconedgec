import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft, User, BookOpen, GraduationCap, CreditCard, RefreshCcw,
  Calendar, MessageSquare, Award, Activity, Loader2, Mail,
} from "lucide-react";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";

const db = supabase as any;

export default function AdminLearnerDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { format: fmtMoney } = useLocalizedPrice();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-learner-360", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [
        profileRes, rolesRes, enrRes, ordersRes, refundsRes, certsRes,
        xpRes, rsvpsRes, chatRes, subsRes, cohortsRes,
      ] = await Promise.all([
        db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        db.from("user_roles").select("role").eq("user_id", userId),
        db.from("enrollments")
          .select("id, course_id, payment_status, progress_percentage, is_completed, access_source, created_at, last_seen_at, courses(title)")
          .eq("user_id", userId).order("created_at", { ascending: false }),
        db.from("orders")
          .select("id, amount, status, course_id, created_at, courses(title)")
          .eq("user_id", userId).order("created_at", { ascending: false }),
        db.from("finance_refunds").select("id, amount, status, order_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        db.from("certificates").select("id, course_id, verification_code, issued_at, courses(title)").eq("user_id", userId).order("issued_at", { ascending: false }),
        supabase.rpc("get_user_xp", { p_user_id: userId! }),
        db.from("cohort_session_rsvps").select("id, session_id, attended, marked_at, cohort_sessions(title, scheduled_at)").eq("user_id", userId).order("marked_at", { ascending: false }).limit(30),
        db.from("chat_conversations").select("id, subject, status, created_at, last_message_at").eq("user_id", userId).order("last_message_at", { ascending: false }).limit(10),
        db.from("assignment_submissions").select("id, assignment_id, grade, submitted_at, assignments(title)").eq("user_id", userId).order("submitted_at", { ascending: false }).limit(20),
        db.from("cohort_members").select("cohort_id, role, cohorts(name, cohort_number, course_id, courses(title))").eq("user_id", userId),
      ]);

      let email = "";
      try {
        const { data: emails } = await supabase.rpc("get_cohort_member_emails", { p_cohort_id: (cohortsRes.data ?? [])[0]?.cohort_id ?? "00000000-0000-0000-0000-000000000000" });
        email = (emails ?? []).find((e: any) => e.user_id === userId)?.email ?? "";
      } catch { /* non-admin fallback silently */ }

      const PAID = new Set(["paid","success","completed","confirmed"]);
      const grossPaid = (ordersRes.data ?? []).filter((o: any) => PAID.has(String(o.status ?? "").toLowerCase()))
        .reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
      const refunded = (refundsRes.data ?? []).filter((r: any) => ["refunded","succeeded","completed","success"].includes(String(r.status ?? "").toLowerCase()))
        .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

      return {
        profile: profileRes.data,
        email,
        roles: (rolesRes.data ?? []).map((r: any) => r.role),
        enrollments: enrRes.data ?? [],
        orders: ordersRes.data ?? [],
        refunds: refundsRes.data ?? [],
        certs: certsRes.data ?? [],
        xp: xpRes.data?.[0] ?? { total_points: 0, level: 1 },
        rsvps: rsvpsRes.data ?? [],
        chats: chatRes.data ?? [],
        submissions: subsRes.data ?? [],
        cohorts: cohortsRes.data ?? [],
        grossPaid,
        refunded,
        netSpend: Math.max(0, grossPaid - refunded),
      };
    },
  });

  if (isLoading || !data) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const p = data.profile;
  const displayName = p?.full_name || "Unnamed learner";
  const attendedRate = data.rsvps.length
    ? Math.round((data.rsvps.filter((r: any) => r.attended).length / data.rsvps.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Helmet><title>{displayName} · Learner 360 · Admin</title></Helmet>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/people?tab=students"><ArrowLeft className="h-4 w-4 mr-1" /> Back to students</Link>
        </Button>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-lg font-bold shrink-0">
            {p?.avatar_url ? <img src={p.avatar_url} alt={displayName} className="w-full h-full rounded-full object-cover" /> : displayName[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-2xl font-bold truncate">{displayName}</h1>
              {data.roles.map((r: string) => (
                <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-[10px] uppercase">{r}</Badge>
              ))}
            </div>
            {data.email && (
              <a href={`mailto:${data.email}`} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-primary">
                <Mail className="h-3.5 w-3.5" /> {data.email}
              </a>
            )}
            <p className="text-xs text-muted-foreground font-mono mt-1">{userId}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
          <Stat icon={GraduationCap} label="Enrollments" value={data.enrollments.length} />
          <Stat icon={Award} label="Certificates" value={data.certs.length} />
          <Stat icon={CreditCard} label="Net spend" value={fmtMoney(data.netSpend)} />
          <Stat icon={Activity} label="XP · Level" value={`${data.xp.total_points} · L${data.xp.level}`} />
          <Stat icon={Calendar} label="Attendance" value={data.rsvps.length ? `${attendedRate}%` : "—"} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Enrollments
          </h3>
          {data.enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments.</p>
          ) : (
            <div className="space-y-3">
              {data.enrollments.map((e: any) => (
                <div key={e.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.courses?.title ?? "Course"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.payment_status} · {e.access_source ?? "self"} · {new Date(e.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={e.is_completed ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {e.is_completed ? "Completed" : `${e.progress_percentage ?? 0}%`}
                    </Badge>
                  </div>
                  <Progress value={e.progress_percentage ?? 0} className="h-1.5 mt-2" />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Orders & Refunds
          </h3>
          {data.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.orders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
                  <div className="min-w-0">
                    <p className="truncate">{o.courses?.title ?? "Order"}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">{fmtMoney(Number(o.amount || 0))}</p>
                    <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                  </div>
                </div>
              ))}
              {data.refunds.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
                  <div className="flex items-center gap-2 text-red-500">
                    <RefreshCcw className="h-3.5 w-3.5" /> Refund
                  </div>
                  <div className="text-right">
                    <p className="text-red-500 tabular-nums">-{fmtMoney(Number(r.amount || 0))}</p>
                    <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Cohorts
          </h3>
          {data.cohorts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not in any cohort.</p>
          ) : (
            <div className="space-y-2">
              {data.cohorts.map((c: any) => (
                <div key={c.cohort_id} className="flex items-center justify-between border-b border-border last:border-0 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">
                      {c.cohorts?.cohort_number != null && <span className="text-primary font-semibold mr-1">C{c.cohorts.cohort_number}</span>}
                      {c.cohorts?.name ?? "Cohort"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.cohorts?.courses?.title ?? ""}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase">{c.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> Assignment submissions
          </h3>
          {data.submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {data.submissions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
                  <div className="min-w-0">
                    <p className="truncate">{s.assignments?.title ?? "Assignment"}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(s.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={s.grade != null ? "default" : "outline"} className="text-[10px]">
                    {s.grade != null ? `${s.grade} pts` : "Ungraded"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Live session attendance
          </h3>
          {data.rsvps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions RSVP'd yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {data.rsvps.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
                  <div className="min-w-0">
                    <p className="truncate">{r.cohort_sessions?.title ?? "Session"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.cohort_sessions?.scheduled_at ? new Date(r.cohort_sessions.scheduled_at).toLocaleString() : "—"}
                    </p>
                  </div>
                  <Badge variant={r.attended ? "default" : "outline"} className="text-[10px]">
                    {r.attended ? "Attended" : "No-show"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Support chats
          </h3>
          {data.chats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No support conversations.</p>
          ) : (
            <div className="space-y-2">
              {data.chats.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
                  <div className="min-w-0">
                    <p className="truncate">{c.subject ?? "Conversation"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : "—"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-lg font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}