import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
import { isPaidEnrollment, isFreeEnrollment } from "@/lib/analytics-helpers";
import {
  TrendingUp, Users, GraduationCap, DollarSign, BookOpen, ArrowUpRight, ArrowDownRight,
  Megaphone, BarChart3, Activity, Zap, Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { useEffect, useState } from "react";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";

const COLORS = [
  "hsl(276, 100%, 62%)",
  "hsl(197, 100%, 47%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 65%, 60%)",
];

function AnimatedNumber({ value, prefix = "", suffix = "", formatter }: { value: number; prefix?: string; suffix?: string; formatter?: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const step = Math.max(1, Math.floor(end / 72));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value]);
  if (formatter) return <>{formatter(display)}</>;
  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalytics() {
  const { toast } = useToast();
  const { format: fmtMoney } = useLocalizedPrice();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      // Use fetchAllRows so we never silently drop rows past the 1000-row
      // PostgREST cap — keeps Platform Analytics consistent with Marketing
      // Analytics and Overview.
      const [courses, enrollments, profiles, promos, referrals, orders, refunds] = await Promise.all([
        fetchAllRows<any>("courses", "id, title, category, price, students_enrolled, difficulty, is_published, created_at"),
        fetchAllRows<any>("enrollments", "id, payment_status, progress_percentage, is_completed, created_at, course_id"),
        fetchAllRows<any>("profiles", "id, created_at"),
        fetchAllRows<any>("promo_codes", "id, code, usage_count, revenue_generated, is_active, commission_percentage, discount_value, discount_type"),
        fetchAllRows<any>("influencer_referrals", "id, commission_earned, final_price, original_price, discount_applied, created_at"),
        fetchAllRows<any>("orders", "id, amount, status, course_id, created_at"),
        fetchAllRows<any>("finance_refunds", "id, amount, status, order_id").catch(() => [] as any[]),
      ]);
      const now = new Date();

      const courseMap = new Map(courses.map(c => [c.id, c]));
      // Real revenue = sum of paid orders (Paystack-verified). Never derive
      // from enrollment counts × list price — that inflates the number
      // because legacy event/promo enrollments carry a `paid` status without
      // a matching Paystack payment.
      const PAID_ORDER = new Set(["paid","success","completed","confirmed"]);
      const paidOrders = (orders as any[]).filter(o => PAID_ORDER.has(String(o.status ?? "").toLowerCase()));
      const grossRevenue = paidOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
      // Net revenue subtracts settled refunds so the KPI reflects money we
      // actually kept, not just what Paystack captured before chargebacks.
      const REFUNDED = new Set(["refunded","succeeded","completed","success"]);
      const totalRefunded = (refunds as any[])
        .filter((r: any) => REFUNDED.has(String(r.status ?? "").toLowerCase()))
        .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const totalEstRevenue = Math.max(0, grossRevenue - totalRefunded);
      const paidEnrollments = enrollments.filter(isPaidEnrollment);
      const freeEnrollments = enrollments.filter(isFreeEnrollment);

      const totalPromoRevenue = promos.reduce((s, p) => s + Number(p.revenue_generated ?? 0), 0);
      const totalCommission = referrals.reduce((s, r) => s + Number(r.commission_earned ?? 0), 0);
      const totalDiscount = referrals.reduce((s, r) => s + Number(r.discount_applied ?? 0), 0);

      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
        const enrCount = enrollments.filter(e => { const ed = new Date(e.created_at); return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear(); }).length;
        const userCount = profiles.filter(p => { const pd = new Date(p.created_at); return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear(); }).length;
        const refCount = referrals.filter(r => { const rd = new Date(r.created_at); return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear(); }).length;
        return { month: label, enrollments: enrCount, users: userCount, referrals: refCount };
      });

      const diffMap: Record<string, number> = {};
      courses.forEach(c => { diffMap[c.difficulty] = (diffMap[c.difficulty] ?? 0) + 1; });
      const difficultyData = Object.entries(diffMap).map(([name, value]) => ({ name, value }));

      const catRevenue: Record<string, number> = {};
      paidOrders.forEach(o => {
        if (!o.course_id) return;
        const course = courseMap.get(o.course_id);
        if (!course) return;
        const cat = course.category.length > 15 ? course.category.slice(0, 13) + "…" : course.category;
        catRevenue[cat] = (catRevenue[cat] ?? 0) + Number(o.amount || 0);
      });
      const catRevenueData = Object.entries(catRevenue).map(([name, revenue]) => ({ name, revenue }));

      const courseEnrMap: Record<string, number> = {};
      // Top-courses chart should reflect *paid* enrollment demand only,
      // otherwise webinar-only sign-ups inflate course numbers.
      paidEnrollments.forEach(e => { courseEnrMap[e.course_id] = (courseEnrMap[e.course_id] ?? 0) + 1; });
      const topCourses = Object.entries(courseEnrMap)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([id, count]) => { const c = courseMap.get(id); return { name: c?.title ? (c.title.length > 26 ? c.title.slice(0, 24) + "…" : c.title) : id.slice(0, 8), enrollments: count }; });

      // Per-course completion rate: enrolled + completed + avg progress %.
      // Excludes free webinar rows so numbers reflect real learners.
      const perCourseCompletion = courses
        .filter((c: any) => c.is_published !== false)
        .map((c: any) => {
          const enr = paidEnrollments.filter((e: any) => e.course_id === c.id);
          const completed = enr.filter((e: any) => e.is_completed).length;
          const avg = enr.length
            ? enr.reduce((s: number, e: any) => s + Number(e.progress_percentage ?? 0), 0) / enr.length
            : 0;
          return {
            id: c.id,
            title: c.title,
            enrolled: enr.length,
            completed,
            rate: enr.length ? Math.round((completed / enr.length) * 100) : 0,
            avg: Math.round(avg),
          };
        })
        .filter((c) => c.enrolled > 0)
        .sort((a, b) => b.rate - a.rate);

      // Completion / progress metrics only meaningful for actual paid course
      // learners — webinar `free` rows have no curriculum to complete.
      const learnerEnrollments = paidEnrollments.length > 0 ? paidEnrollments : enrollments.filter(e => e.payment_status !== "free");
      const completedCount = learnerEnrollments.filter(e => e.is_completed).length;
      const completionRate = learnerEnrollments.length > 0 ? Math.round((completedCount / learnerEnrollments.length) * 100) : 0;
      const avgProgress = learnerEnrollments.length > 0 ? Math.round(learnerEnrollments.reduce((s, e) => s + Number(e.progress_percentage ?? 0), 0) / learnerEnrollments.length) : 0;
      const topPromos = [...promos].sort((a, b) => Number(b.revenue_generated) - Number(a.revenue_generated)).slice(0, 5);

      return { totalCourses: courses.length, totalUsers: profiles.length, totalEnrollments: enrollments.length, totalEstRevenue, totalPromoRevenue, totalCommission, totalDiscount, completionRate, avgProgress, paidCount: paidEnrollments.length, freeCount: freeEnrollments.length, monthlyData, difficultyData, catRevenueData, topCourses, topPromos, perCourseCompletion };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const kpis: Array<{ label: string; value: number; prefix?: string; suffix?: string; formatter?: (n: number) => string; icon: any; gradient: string; accent: string }> = [
    { label: "Est. Revenue", value: data?.totalEstRevenue ?? 0, formatter: fmtMoney, icon: DollarSign, gradient: "from-green-500/15 to-emerald-500/5", accent: "text-green-500" },
    { label: "Paid Enrollments", value: data?.paidCount ?? 0, icon: GraduationCap, gradient: "from-primary/15 to-accent/5", accent: "text-primary" },
    { label: "Completion Rate", value: data?.completionRate ?? 0, suffix: "%", icon: TrendingUp, gradient: "from-amber-500/15 to-yellow-500/5", accent: "text-amber-500" },
    { label: "Avg Progress", value: data?.avgProgress ?? 0, suffix: "%", icon: BarChart3, gradient: "from-blue-500/15 to-cyan-500/5", accent: "text-blue-500" },
    { label: "Promo Revenue", value: data?.totalPromoRevenue ?? 0, formatter: fmtMoney, icon: Megaphone, gradient: "from-primary/15 to-accent/5", accent: "text-primary" },
    { label: "Commission Paid", value: data?.totalCommission ?? 0, formatter: fmtMoney, icon: ArrowDownRight, gradient: "from-red-500/15 to-rose-500/5", accent: "text-red-400" },
  ];

  const tooltipStyle = { fontSize: 11, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 8px 32px -8px hsl(var(--primary) / 0.1)" };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">In-depth platform metrics and performance insights.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!data) return;
              downloadCSV("analytics-monthly.csv",
                ["Month", "Enrollments", "Users", "Referrals"],
                (data.monthlyData ?? []).map(m => [m.month, String(m.enrollments), String(m.users), String(m.referrals)])
              );
              toast({ title: "Exported", description: "Monthly trends CSV downloaded." });
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 200, damping: 20 }}
            whileHover={{ y: -2, scale: 1.02 }}
            className="relative overflow-hidden bg-card rounded-2xl border border-border p-4 group hover:border-primary/20 transition-all duration-300"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className="relative z-10">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kpi.gradient} flex items-center justify-center mb-2`}>
                <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
              </div>
              <p className="font-heading text-lg font-bold">
                <AnimatedNumber value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} formatter={kpi.formatter} />
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">{kpi.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border border-border p-5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-sm">Enrollment & User Trends</h3>
              <p className="text-xs text-muted-foreground">12-month overview</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyData ?? []}>
                <defs>
                  <linearGradient id="analyticsEnrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(276, 100%, 62%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(276, 100%, 62%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="analyticsUsrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="enrollments" stroke="hsl(276, 100%, 62%)" fill="url(#analyticsEnrGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(276, 100%, 62%)", strokeWidth: 0 }} />
                <Area type="monotone" dataKey="users" stroke="hsl(142, 71%, 45%)" fill="url(#analyticsUsrGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(142, 71%, 45%)", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2">
            {[{ color: "hsl(276, 100%, 62%)", label: "Enrollments" }, { color: "hsl(142, 71%, 45%)", label: "New Users" }].map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} /> {l.label}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-sm">Revenue by Category</h3>
              <p className="text-xs text-muted-foreground">Based on paid enrollments</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="h-64">
            {(data?.catRevenueData ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.catRevenueData ?? []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtMoney(Number(v)), "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(197, 100%, 47%)" radius={[0, 6, 6, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <DollarSign className="h-8 w-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">No revenue data yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl border border-border p-5 hover:border-primary/20 transition-all duration-300">
          <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Course Difficulty
          </h3>
          <div className="h-48">
            {(data?.difficultyData ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.difficultyData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={65} strokeWidth={2} animationBegin={300} animationDuration={800}>
                    {(data?.difficultyData ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">No data</p></div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-1">
            {(data?.difficultyData ?? []).map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-5 hover:border-primary/20 transition-all duration-300">
          <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Top Courses by Enrollment
          </h3>
          <div className="space-y-3">
            {(data?.topCourses ?? []).length > 0 ? (
              (data?.topCourses ?? []).map((c, i) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="flex items-center gap-3 group/course"
                >
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{c.name}</p>
                    <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (c.enrollments / Math.max(1, data?.topCourses?.[0]?.enrollments ?? 1)) * 100)}%` }}
                        transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold flex-shrink-0 tabular-nums">{c.enrollments}</span>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10"><p className="text-sm text-muted-foreground">No enrollments yet</p></div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-card rounded-2xl border border-border p-5 hover:border-primary/20 transition-all duration-300">
          <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Top Promo Codes
          </h3>
          <div className="space-y-2">
            {(data?.topPromos ?? []).length > 0 ? (
              (data?.topPromos ?? []).map((p: any, i: number) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-200"
                >
                  <div>
                    <p className="text-xs font-mono font-semibold">{p.code}</p>
                    <p className="text-[10px] text-muted-foreground">{p.usage_count} uses</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular-nums">{fmtMoney(Number(p.revenue_generated))}</p>
                    <span className={`text-[10px] font-medium ${p.is_active ? "text-green-500" : "text-muted-foreground"}`}>
                      {p.is_active ? "● Active" : "○ Inactive"}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10"><p className="text-sm text-muted-foreground">No promo codes yet</p></div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Per-course completion rates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-2xl border border-border p-5 hover:border-primary/20 transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> Student completion rate by course
          </h3>
          <span className="text-[10px] text-muted-foreground">Paid enrollments only</span>
        </div>
        {(data?.perCourseCompletion ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No paid enrollments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Course</th>
                  <th className="py-2 px-2 font-medium tabular-nums text-right">Enrolled</th>
                  <th className="py-2 px-2 font-medium tabular-nums text-right">Completed</th>
                  <th className="py-2 px-2 font-medium tabular-nums text-right">Avg progress</th>
                  <th className="py-2 pl-2 font-medium w-40">Completion rate</th>
                </tr>
              </thead>
              <tbody>
                {(data?.perCourseCompletion ?? []).map((c: any) => (
                  <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-3 truncate max-w-[280px]" title={c.title}>{c.title}</td>
                    <td className="py-2 px-2 tabular-nums text-right">{c.enrolled}</td>
                    <td className="py-2 px-2 tabular-nums text-right">{c.completed}</td>
                    <td className="py-2 px-2 tabular-nums text-right">{c.avg}%</td>
                    <td className="py-2 pl-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${c.rate}%` }} />
                        </div>
                        <span className="tabular-nums font-semibold w-8 text-right">{c.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
