import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Users, GraduationCap, MessageSquareQuote, CreditCard, UserCheck,
  TrendingUp, ArrowUpRight, Megaphone, Clock, Sparkles, Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { useEffect, useState } from "react";

const CHART_COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(197, 100%, 47%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 65%, 60%)",
];

function AnimatedCounter({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const step = Math.max(1, Math.floor(end / (duration * 60)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
}

function StatCard({ card, i }: { card: any; i: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: i * 0.07, type: "spring", stiffness: 200, damping: 20 }}
    >
      <Link
        to={card.href}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative overflow-hidden bg-card rounded-2xl border border-border p-5 flex items-center gap-4 hover:border-primary/40 transition-all duration-300 block"
      >
        {/* Gradient glow on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
        {/* Shimmer line */}
        <motion.div
          className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: hovered ? "100%" : "-100%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
        <motion.div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center flex-shrink-0 relative"
          animate={{ rotate: hovered ? 5 : 0, scale: hovered ? 1.05 : 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <card.icon className="h-5 w-5 text-primary" />
          {hovered && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-primary/30"
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </motion.div>
        <div className="relative z-10">
          <p className="text-2xl font-heading font-bold">
            {typeof card.value === "number" ? <AnimatedCounter value={card.value} /> : card.value}
          </p>
          <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{card.sub}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary ml-auto transition-colors duration-200 relative z-10" />
      </Link>
    </motion.div>
  );
}

const ChartCard = ({ title, subtitle, icon: Icon, children, delay = 0 }: { title: string; subtitle: string; icon: any; children: React.ReactNode; delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 150, damping: 20 }}
      className="group bg-card rounded-2xl border border-border p-5 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      {children}
    </motion.div>
  );
}

export default function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [courses, instructors, enrollments, testimonials, plans, profiles, promoCodes] = await Promise.all([
        supabase.from("courses").select("id, title, is_published, category, price, students_enrolled, created_at"),
        supabase.from("instructors").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id, payment_status, created_at, course_id"),
        supabase.from("testimonials").select("id", { count: "exact", head: true }),
        supabase.from("pricing_plans").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("promo_codes").select("id, usage_count, revenue_generated, is_active"),
      ]);
      const [regsRes, leadsRes] = await Promise.all([
        (supabase.from("course_registrations") as any).select("id, status, created_at"),
        supabase.from("business_leads").select("id, status, created_at"),
      ]);

      const allCourses = courses.data ?? [];
      const allEnrollments = enrollments.data ?? [];
      const allProfiles = profiles.data ?? [];
      const allPromos = promoCodes.data ?? [];

      const publishedCount = allCourses.filter(c => c.is_published).length;
      const totalRevenue = allEnrollments.filter(e => e.payment_status === "confirmed" || e.payment_status === "paid").length;
      const promoRevenue = allPromos.reduce((sum, p) => sum + Number(p.revenue_generated ?? 0), 0);
      const activePromos = allPromos.filter(p => p.is_active).length;

      const categoryMap: Record<string, number> = {};
      allCourses.forEach(c => { categoryMap[c.category] = (categoryMap[c.category] ?? 0) + 1; });
      const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + "…" : name, value }));

      const now = new Date();
      const monthlyEnrollments = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const monthStr = d.toLocaleString("default", { month: "short" });
        const count = allEnrollments.filter(e => {
          const ed = new Date(e.created_at);
          return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
        }).length;
        return { month: monthStr, enrollments: count };
      });

      const monthlySignups = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const monthStr = d.toLocaleString("default", { month: "short" });
        const count = allProfiles.filter(p => {
          const pd = new Date(p.created_at);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        }).length;
        return { month: monthStr, signups: count };
      });

      // Build course title map for recent enrollments
      const courseMap = new Map<string, string>();
      allCourses.forEach(c => courseMap.set(c.id, c.title));

      const recentEnrollments = allEnrollments.slice(0, 5).map(e => ({
        ...e,
        course_title: courseMap.get(e.course_id) ?? e.course_id?.slice(0, 8) + "...",
      }));

      return {
        courses: allCourses.length,
        published: publishedCount,
        instructors: instructors.count ?? 0,
        enrollments: allEnrollments.length,
        testimonials: testimonials.count ?? 0,
        plans: plans.count ?? 0,
        users: allProfiles.length,
        totalRevenue,
        promoRevenue,
        activePromos,
        categoryData,
        monthlyEnrollments,
        monthlySignups,
        recentEnrollments,
        registrations: (regsRes.data ?? []).length,
        newRegistrations: (regsRes.data ?? []).filter((r: any) => r.status === "new").length,
        businessLeads: (leadsRes.data ?? []).length,
      };
    },
  });

  const statCards = [
    { label: "Total Courses", value: stats?.courses ?? 0, sub: `${stats?.published ?? 0} published`, icon: BookOpen, href: "/admin/courses" },
    { label: "Total Users", value: stats?.users ?? 0, sub: "registered accounts", icon: Users, href: "/admin/users" },
    { label: "Enrollments", value: stats?.enrollments ?? 0, sub: `${stats?.totalRevenue ?? 0} paid`, icon: GraduationCap, href: "/admin/enrollments" },
    { label: "Webinar Registrations", value: stats?.registrations ?? 0, sub: `${stats?.newRegistrations ?? 0} new leads`, icon: ClipboardCheck, href: "/admin/registrations" },
    { label: "Business Leads", value: stats?.businessLeads ?? 0, sub: "B2B inquiries", icon: Briefcase, href: "/admin/business-leads" },
    { label: "Instructors", value: stats?.instructors ?? 0, sub: "active mentors", icon: UserCheck, href: "/admin/instructors" },
    { label: "Promo Codes", value: stats?.activePromos ?? 0, sub: `₦${(stats?.promoRevenue ?? 0).toLocaleString()} revenue`, icon: Megaphone, href: "/admin/influencers-marketing" },
    { label: "Testimonials", value: stats?.testimonials ?? 0, sub: "published reviews", icon: MessageSquareQuote, href: "/admin/testimonials" },
  ];

  return (
    <div className="space-y-8">
      {/* Header with animated accent */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Welcome back. Here's what's happening with your platform.</p>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={card.label} card={card} i={i} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Enrollment Trends" subtitle="Last 6 months" icon={TrendingUp} delay={0.1}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.monthlyEnrollments ?? []}>
                <defs>
                  <linearGradient id="overviewEnrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 8px 32px -8px hsl(var(--primary) / 0.15)" }} />
                <Area type="monotone" dataKey="enrollments" stroke="hsl(262, 83%, 58%)" fill="url(#overviewEnrGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(262, 83%, 58%)", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Course Categories" subtitle="Distribution by category" icon={BookOpen} delay={0.15}>
          <div className="h-56 flex items-center">
            {(stats?.categoryData ?? []).length > 0 ? (
              <div className="flex items-center w-full gap-4">
                <div className="w-1/2 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.categoryData ?? []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%" cy="50%"
                        innerRadius={35} outerRadius={70}
                        strokeWidth={2}
                        animationBegin={200}
                        animationDuration={800}
                      >
                        {(stats?.categoryData ?? []).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2.5">
                  {(stats?.categoryData ?? []).map((cat, i) => (
                    <motion.div
                      key={cat.name}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="flex items-center gap-2 text-xs group/legend"
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-transparent group-hover/legend:ring-primary/20 transition-all" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{cat.name}</span>
                      <span className="font-semibold ml-auto tabular-nums">{cat.value}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center w-full">No courses yet</p>
            )}
          </div>
        </ChartCard>
      </div>

      {/* User Growth + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="User Growth" subtitle="New signups per month" icon={ArrowUpRight} delay={0.2}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.monthlySignups ?? []}>
                <defs>
                  <linearGradient id="overviewUsrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Area type="monotone" dataKey="signups" stroke="hsl(142, 71%, 45%)" fill="url(#overviewUsrGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(142, 71%, 45%)", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Recent Enrollments" subtitle="Latest activity" icon={Clock} delay={0.25}>
          <div className="space-y-2">
            {(stats?.recentEnrollments ?? []).length > 0 ? (
              (stats?.recentEnrollments ?? []).map((e: any, i: number) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-200 group/item"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center group-hover/item:from-primary/25 transition-all">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{e.course_title}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                    e.payment_status === "confirmed" || e.payment_status === "paid"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}>
                    {e.payment_status}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No enrollments yet</p>
              </div>
            )}
          </div>
          <Link to="/admin/enrollments" className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-3 font-medium group/link">
            View all enrollments
            <ArrowUpRight className="h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
          </Link>
        </ChartCard>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
        className="bg-card rounded-2xl border border-border p-5"
      >
        <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Add Course", href: "/admin/courses", icon: BookOpen },
            { label: "Add Instructor", href: "/admin/instructors", icon: UserCheck },
            { label: "Create Promo", href: "/admin/influencers-marketing", icon: Megaphone },
            { label: "Manage Content", href: "/admin/content", icon: CreditCard },
          ].map((action, i) => (
            <motion.div
              key={action.label}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link
                to={action.href}
                className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-border hover:border-primary/30 bg-gradient-to-b from-transparent to-primary/[0.02] hover:to-primary/[0.06] transition-all text-center group/action"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover/action:bg-primary/15 flex items-center justify-center transition-colors">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-medium">{action.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
