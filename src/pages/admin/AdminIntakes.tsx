import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, CreditCard, CalendarRange, Gift } from "lucide-react";

/**
 * Intake (cohort run) breakdown.
 *
 * Records are attributed to the cohort run they belong to instead of being
 * lumped together: a signup counts towards the latest cohort of that course
 * whose "sales window" has opened (i.e. after the previous cohort finished).
 */

interface CohortRun {
  id: string;
  course_id: string | null;
  name: string;
  cohort_number: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  windowStart: number; // ms, inclusive
  windowEnd: number; // ms, exclusive
}

const UNASSIGNED = "__unassigned__";

function buildRuns(cohorts: any[]): Map<string, CohortRun[]> {
  const byCourse = new Map<string, any[]>();
  cohorts.forEach((c) => {
    if (!c.course_id) return;
    const list = byCourse.get(c.course_id) ?? [];
    list.push(c);
    byCourse.set(c.course_id, list);
  });
  const out = new Map<string, CohortRun[]>();
  byCourse.forEach((list, courseId) => {
    const sorted = [...list].sort((a, b) =>
      (a.start_date ?? "").localeCompare(b.start_date ?? ""),
    );
    const runs: CohortRun[] = sorted.map((c, i) => {
      const prev = sorted[i - 1];
      // Sales for a cohort open when the previous cohort has finished (or started).
      const openFrom = prev
        ? new Date(prev.end_date ?? prev.start_date ?? 0).getTime()
        : -Infinity;
      const next = sorted[i + 1];
      const closeAt = next
        ? new Date(c.end_date ?? c.start_date ?? 0).getTime()
        : Infinity;
      return {
        id: c.id,
        course_id: c.course_id,
        name: c.name,
        cohort_number: c.cohort_number,
        start_date: c.start_date,
        end_date: c.end_date,
        status: c.status,
        windowStart: openFrom,
        windowEnd: closeAt,
      };
    });
    out.set(courseId, runs);
  });
  return out;
}

function runFor(runs: Map<string, CohortRun[]>, courseId: string | null, at: string | null) {
  if (!courseId) return null;
  const list = runs.get(courseId);
  if (!list?.length) return null;
  const t = at ? new Date(at).getTime() : 0;
  // Latest run whose window has opened.
  let match: CohortRun | null = null;
  for (const r of list) {
    if (t >= r.windowStart && t < r.windowEnd) match = r;
  }
  return match ?? list[list.length - 1];
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;

export default function AdminIntakes() {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-intakes"],
    queryFn: async () => {
      const [cohorts, courses, enrollments, registrations, orders, bootcampCohorts, bootcampEnrollments] =
        await Promise.all([
          fetchAllRows<any>("cohorts", "id, course_id, name, cohort_number, start_date, end_date, status"),
          fetchAllRows<any>("courses", "id, title, price"),
          fetchAllRows<any>("enrollments", "user_id, course_id, payment_status, created_at"),
          fetchAllRows<any>("course_registrations", "id, course_id, user_id, registration_type, status, created_at"),
          fetchAllRows<any>("orders", "id, course_id, amount, status, created_at"),
          fetchAllRows<any>("bootcamp_cohorts", "id, name, cohort_number, course_id, start_date, end_date, is_active"),
          fetchAllRows<any>(
            "bootcamp_enrollments",
            "id, cohort_id, status, amount_paid, total_amount, access_granted, created_at",
          ),
        ]);
      return { cohorts, courses, enrollments, registrations, orders, bootcampCohorts, bootcampEnrollments };
    },
  });

  const model = useMemo(() => {
    if (!data) return null;
    const runs = buildRuns(data.cohorts);
    const courseById = new Map(data.courses.map((c: any) => [c.id, c]));
    // A course counts as a webinar when it has webinar-type registrations.
    const webinarCourseIds = new Set<string>(
      data.registrations
        .filter((r: any) => r.registration_type === "webinar" && r.course_id)
        .map((r: any) => r.course_id as string),
    );

    type Bucket = {
      key: string;
      courseId: string;
      courseTitle: string;
      isWebinar: boolean;
      run: CohortRun | null;
      paid: number;
      free: number;
      registrations: number;
      attended: number;
      revenue: number;
      firstAt: string | null;
      lastAt: string | null;
    };
    const buckets = new Map<string, Bucket>();
    const get = (courseId: string, run: CohortRun | null): Bucket => {
      const key = `${courseId}:${run?.id ?? UNASSIGNED}`;
      let b = buckets.get(key);
      if (!b) {
        const course: any = courseById.get(courseId);
        b = {
          key,
          courseId,
          courseTitle: course?.title ?? "Unknown course",
          isWebinar: webinarCourseIds.has(courseId),
          run,
          paid: 0,
          free: 0,
          registrations: 0,
          attended: 0,
          revenue: 0,
          firstAt: null,
          lastAt: null,
        };
        buckets.set(key, b);
      }
      return b;
    };
    const stamp = (b: Bucket, at: string | null) => {
      if (!at) return;
      if (!b.firstAt || at < b.firstAt) b.firstAt = at;
      if (!b.lastAt || at > b.lastAt) b.lastAt = at;
    };

    data.enrollments.forEach((e: any) => {
      if (!e.course_id) return;
      const b = get(e.course_id, runFor(runs, e.course_id, e.created_at));
      if (e.payment_status === "paid" || e.payment_status === "confirmed") b.paid += 1;
      else b.free += 1;
      stamp(b, e.created_at);
    });

    data.registrations.forEach((r: any) => {
      if (!r.course_id) return;
      const b = get(r.course_id, runFor(runs, r.course_id, r.created_at));
      b.registrations += 1;
      if (r.status === "attended") b.attended += 1;
      stamp(b, r.created_at);
    });

    data.orders.forEach((o: any) => {
      if (!o.course_id) return;
      if (!["completed", "paid", "success"].includes(String(o.status))) return;
      const b = get(o.course_id, runFor(runs, o.course_id, o.created_at));
      b.revenue += Number(o.amount ?? 0);
      stamp(b, o.created_at);
    });

    const all = Array.from(buckets.values()).sort((a, b) => {
      const t = (a.courseTitle ?? "").localeCompare(b.courseTitle ?? "");
      if (t !== 0) return t;
      return (b.run?.start_date ?? "").localeCompare(a.run?.start_date ?? "");
    });

    // Bootcamp intakes come straight off bootcamp_cohorts.
    const bootcamps = data.bootcampCohorts
      .map((bc: any) => {
        const rows = data.bootcampEnrollments.filter((e: any) => e.cohort_id === bc.id);
        const paying = rows.filter((r: any) => Number(r.amount_paid ?? 0) > 0);
        const fullyPaid = rows.filter(
          (r: any) => Number(r.amount_paid ?? 0) >= Number(r.total_amount ?? 0) && Number(r.total_amount ?? 0) > 0,
        );
        return {
          id: bc.id,
          name: bc.name,
          cohort_number: bc.cohort_number,
          start_date: bc.start_date,
          end_date: bc.end_date,
          is_active: bc.is_active,
          course: (courseById.get(bc.course_id) as any)?.title ?? "—",
          signups: rows.length,
          paying: paying.length,
          fullyPaid: fullyPaid.length,
          partPaying: paying.length - fullyPaid.length,
          collected: rows.reduce((s: number, r: any) => s + Number(r.amount_paid ?? 0), 0),
          expected: rows.reduce((s: number, r: any) => s + Number(r.total_amount ?? 0), 0),
          granted: rows.filter((r: any) => r.access_granted).length,
        };
      })
      .sort((a: any, b: any) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));

    return {
      courses: all.filter((b) => !b.isWebinar),
      webinars: all.filter((b) => b.isWebinar),
      bootcamps,
    };
  }, [data]);

  const filter = (rows: any[], fields: string[]) =>
    rows.filter((r) =>
      !q ||
      fields.some((f) => String(r[f] ?? "").toLowerCase().includes(q.toLowerCase())) ||
      String(r.run?.name ?? "").toLowerCase().includes(q.toLowerCase()),
    );

  if (isLoading || !model) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Intakes by Cohort</h2>
        <p className="text-sm text-muted-foreground">
          Signups and payments split per cohort run, so a new intake never gets mixed with previous ones.
        </p>
      </div>
      <Input
        placeholder="Search course or cohort…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />
      <Tabs defaultValue="bootcamps">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="bootcamps">Bootcamps</TabsTrigger>
          <TabsTrigger value="webinars">Webinars</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
        </TabsList>

        <TabsContent value="bootcamps" className="mt-4 grid gap-3">
          {filter(model.bootcamps, ["name", "course"]).length === 0 && <Empty />}
          {filter(model.bootcamps, ["name", "course"]).map((b: any) => (
            <Card key={b.id} className="p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {b.cohort_number != null && <Badge variant="secondary">Cohort {b.cohort_number}</Badge>}
                    <span className="font-semibold">{b.name}</span>
                    <Badge variant={b.is_active ? "default" : "outline"} className="text-[10px]">
                      {b.is_active ? "Open / current" : "Closed"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{b.course}</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {fmtDate(b.start_date)} – {fmtDate(b.end_date)}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat icon={<Users className="h-3.5 w-3.5" />} label="Signups" value={b.signups} />
                <Stat icon={<CreditCard className="h-3.5 w-3.5" />} label="Paid in full" value={b.fullyPaid} />
                <Stat icon={<CreditCard className="h-3.5 w-3.5" />} label="Part payment" value={b.partPaying} />
                <Stat icon={<Users className="h-3.5 w-3.5" />} label="Access granted" value={b.granted} />
              </div>
              <div className="text-xs text-muted-foreground">
                Collected <span className="font-medium text-foreground">{naira(b.collected)}</span> of{" "}
                {naira(b.expected)} expected
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="webinars" className="mt-4 grid gap-3">
          {filter(model.webinars, ["courseTitle"]).length === 0 && <Empty />}
          {filter(model.webinars, ["courseTitle"]).map((b: any) => (
            <IntakeCard key={b.key} b={b} kind="webinar" />
          ))}
        </TabsContent>

        <TabsContent value="courses" className="mt-4 grid gap-3">
          {filter(model.courses, ["courseTitle"]).length === 0 && <Empty />}
          {filter(model.courses, ["courseTitle"]).map((b: any) => (
            <IntakeCard key={b.key} b={b} kind="course" />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntakeCard({ b, kind }: { b: any; kind: "course" | "webinar" }) {
  const run = b.run as CohortRun | null;
  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {run ? (
              <>
                {run.cohort_number != null && <Badge variant="secondary">Cohort {run.cohort_number}</Badge>}
                <span className="font-semibold">{run.name}</span>
                <Badge variant="outline" className="text-[10px]">{run.status ?? "—"}</Badge>
              </>
            ) : (
              <>
                <Badge variant="outline">No cohort run</Badge>
                <span className="font-semibold">Self-paced / unassigned</span>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{b.courseTitle}</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="flex items-center gap-1 justify-end">
            <CalendarRange className="h-3.5 w-3.5" />
            {run ? `${fmtDate(run.start_date)} – ${fmtDate(run.end_date)}` : "—"}
          </div>
          <div className="mt-0.5">
            Signups {fmtDate(b.firstAt)} → {fmtDate(b.lastAt)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kind === "webinar" ? (
          <>
            <Stat icon={<Users className="h-3.5 w-3.5" />} label="Registrations" value={b.registrations} />
            <Stat icon={<Users className="h-3.5 w-3.5" />} label="Attended" value={b.attended} />
            <Stat icon={<CreditCard className="h-3.5 w-3.5" />} label="Paid enrolments" value={b.paid} />
            <Stat icon={<Gift className="h-3.5 w-3.5" />} label="Free access" value={b.free} />
          </>
        ) : (
          <>
            <Stat icon={<CreditCard className="h-3.5 w-3.5" />} label="Paid enrolments" value={b.paid} />
            <Stat icon={<Gift className="h-3.5 w-3.5" />} label="Free / granted" value={b.free} />
            <Stat icon={<Users className="h-3.5 w-3.5" />} label="Registrations" value={b.registrations} />
            <Stat label="Revenue" value={naira(b.revenue)} />
          </>
        )}
      </div>
      {kind === "webinar" && b.revenue > 0 && (
        <div className="text-xs text-muted-foreground">
          Revenue in this intake: <span className="font-medium text-foreground">{naira(b.revenue)}</span>
        </div>
      )}
    </Card>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Empty() {
  return <Card className="p-8 text-center text-sm text-muted-foreground">Nothing to show yet.</Card>;
}
