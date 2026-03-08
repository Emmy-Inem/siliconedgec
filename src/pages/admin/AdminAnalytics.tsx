import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, Users, GraduationCap, DollarSign, BookOpen, ArrowUpRight, ArrowDownRight,
  Megaphone, BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

const COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(197, 100%, 47%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 65%, 60%)",
];

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [coursesRes, enrollmentsRes, profilesRes, promosRes, referralsRes] = await Promise.all([
        supabase.from("courses").select("id, category, price, students_enrolled, difficulty, is_published, created_at"),
        supabase.from("enrollments").select("id, payment_status, progress_percentage, is_completed, created_at, course_id"),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("promo_codes").select("id, code, usage_count, revenue_generated, is_active, commission_percentage, discount_value, discount_type"),
        supabase.from("influencer_referrals").select("id, commission_earned, final_price, original_price, discount_applied, created_at"),
      ]);

      const courses = coursesRes.data ?? [];
      const enrollments = enrollmentsRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const promos = promosRes.data ?? [];
      const referrals = referralsRes.data ?? [];

      const now = new Date();

      // Revenue estimation from enrollments
      const courseMap = new Map(courses.map(c => [c.id, c]));
      let totalEstRevenue = 0;
      const paidEnrollments = enrollments.filter(e => e.payment_status === "confirmed" || e.payment_status === "paid");
      paidEnrollments.forEach(e => {
        const course = courseMap.get(e.course_id);
        if (course) totalEstRevenue += Number(course.price ?? 0);
      });

      // Promo stats
      const totalPromoRevenue = promos.reduce((s, p) => s + Number(p.revenue_generated ?? 0), 0);
      const totalCommission = referrals.reduce((s, r) => s + Number(r.commission_earned ?? 0), 0);
      const totalDiscount = referrals.reduce((s, r) => s + Number(r.discount_applied ?? 0), 0);

      // Monthly data (12 months)
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
        const enrCount = enrollments.filter(e => {
          const ed = new Date(e.created_at);
          return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
        }).length;
        const userCount = profiles.filter(p => {
          const pd = new Date(p.created_at);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        }).length;
        const refCount = referrals.filter(r => {
          const rd = new Date(r.created_at);
          return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        }).length;
        return { month: label, enrollments: enrCount, users: userCount, referrals: refCount };
      });

      // Difficulty breakdown
      const diffMap: Record<string, number> = {};
      courses.forEach(c => { diffMap[c.difficulty] = (diffMap[c.difficulty] ?? 0) + 1; });
      const difficultyData = Object.entries(diffMap).map(([name, value]) => ({ name, value }));

      // Category revenue
      const catRevenue: Record<string, number> = {};
      paidEnrollments.forEach(e => {
        const course = courseMap.get(e.course_id);
        if (course) {
          const cat = course.category.length > 15 ? course.category.slice(0, 13) + "…" : course.category;
          catRevenue[cat] = (catRevenue[cat] ?? 0) + Number(course.price ?? 0);
        }
      });
      const catRevenueData = Object.entries(catRevenue).map(([name, revenue]) => ({ name, revenue }));

      // Top courses by enrollment
      const courseEnrMap: Record<string, number> = {};
      enrollments.forEach(e => { courseEnrMap[e.course_id] = (courseEnrMap[e.course_id] ?? 0) + 1; });
      const topCourses = Object.entries(courseEnrMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => {
          const c = courseMap.get(id);
          return { name: c ? (c.category.length > 20 ? c.category.slice(0, 18) + "…" : c.category) : id.slice(0, 8), enrollments: count };
        });

      // Completion rate
      const completedCount = enrollments.filter(e => e.is_completed).length;
      const completionRate = enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0;
      const avgProgress = enrollments.length > 0
        ? Math.round(enrollments.reduce((s, e) => s + Number(e.progress_percentage ?? 0), 0) / enrollments.length)
        : 0;

      // Top promos
      const topPromos = [...promos].sort((a, b) => Number(b.revenue_generated) - Number(a.revenue_generated)).slice(0, 5);

      return {
        totalCourses: courses.length,
        totalUsers: profiles.length,
        totalEnrollments: enrollments.length,
        totalEstRevenue,
        totalPromoRevenue,
        totalCommission,
        totalDiscount,
        completionRate,
        avgProgress,
        paidCount: paidEnrollments.length,
        monthlyData,
        difficultyData,
        catRevenueData,
        topCourses,
        topPromos,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const kpis = [
    { label: "Est. Revenue", value: `$${(data?.totalEstRevenue ?? 0).toLocaleString()}`, icon: DollarSign, accent: "text-green-500", bg: "bg-green-500/10" },
    { label: "Paid Enrollments", value: data?.paidCount ?? 0, icon: GraduationCap, accent: "text-primary", bg: "bg-primary/10" },
    { label: "Completion Rate", value: `${data?.completionRate ?? 0}%`, icon: TrendingUp, accent: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Avg Progress", value: `${data?.avgProgress ?? 0}%`, icon: BarChart3, accent: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Promo Revenue", value: `$${(data?.totalPromoRevenue ?? 0).toLocaleString()}`, icon: Megaphone, accent: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Commission Paid", value: `$${(data?.totalCommission ?? 0).toLocaleString()}`, icon: ArrowDownRight, accent: "text-red-400", bg: "bg-red-500/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold mb-1">Analytics</h1>
        <p className="text-sm text-muted-foreground">In-depth platform metrics and performance insights.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-2`}>
              <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
            </div>
            <p className="font-heading text-lg font-bold">{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment & User Trends */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-1">Enrollment & User Trends</h3>
          <p className="text-xs text-muted-foreground mb-4">12-month overview</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyData ?? []}>
                <defs>
                  <linearGradient id="enrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="usrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Area type="monotone" dataKey="enrollments" stroke="hsl(262, 83%, 58%)" fill="url(#enrGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="users" stroke="hsl(142, 71%, 45%)" fill="url(#usrGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(262, 83%, 58%)" }} /> Enrollments
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(142, 71%, 45%)" }} /> New Users
            </span>
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-1">Revenue by Category</h3>
          <p className="text-xs text-muted-foreground mb-4">Based on paid enrollments</p>
          <div className="h-64">
            {(data?.catRevenueData ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.catRevenueData ?? []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(v: number) => [`$${v}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(197, 100%, 47%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-20">No revenue data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Difficulty Breakdown */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Course Difficulty</h3>
          <div className="h-48">
            {(data?.difficultyData ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.difficultyData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={65} strokeWidth={2}>
                    {(data?.difficultyData ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">No data</p>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-1">
            {(data?.difficultyData ?? []).map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        {/* Top Courses */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Top Courses by Enrollment</h3>
          <div className="space-y-3">
            {(data?.topCourses ?? []).length > 0 ? (
              (data?.topCourses ?? []).map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{c.name}</p>
                    <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (c.enrollments / Math.max(1, data?.topCourses?.[0]?.enrollments ?? 1)) * 100)}%`,
                          background: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium flex-shrink-0">{c.enrollments}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No enrollments yet</p>
            )}
          </div>
        </div>

        {/* Top Promo Codes */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Top Promo Codes</h3>
          <div className="space-y-3">
            {(data?.topPromos ?? []).length > 0 ? (
              (data?.topPromos ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-xs font-mono font-medium">{p.code}</p>
                    <p className="text-[10px] text-muted-foreground">{p.usage_count} uses</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">${Number(p.revenue_generated).toLocaleString()}</p>
                    <span className={`text-[10px] ${p.is_active ? "text-green-600" : "text-muted-foreground"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No promo codes yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
