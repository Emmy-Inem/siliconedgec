import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Users, GraduationCap, MessageSquareQuote, CreditCard, UserCheck,
  TrendingUp, ArrowUpRight, ArrowDownRight, Megaphone, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(197, 100%, 47%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 65%, 60%)",
];

export default function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [courses, instructors, enrollments, testimonials, plans, profiles, promoCodes] = await Promise.all([
        supabase.from("courses").select("id, is_published, category, price, students_enrolled, created_at"),
        supabase.from("instructors").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id, payment_status, created_at, course_id"),
        supabase.from("testimonials").select("id", { count: "exact", head: true }),
        supabase.from("pricing_plans").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("promo_codes").select("id, usage_count, revenue_generated, is_active"),
      ]);

      const allCourses = courses.data ?? [];
      const allEnrollments = enrollments.data ?? [];
      const allProfiles = profiles.data ?? [];
      const allPromos = promoCodes.data ?? [];

      const publishedCount = allCourses.filter(c => c.is_published).length;
      const draftCount = allCourses.length - publishedCount;
      const totalRevenue = allEnrollments.filter(e => e.payment_status === "confirmed" || e.payment_status === "paid").length;
      const promoRevenue = allPromos.reduce((sum, p) => sum + Number(p.revenue_generated ?? 0), 0);
      const activePromos = allPromos.filter(p => p.is_active).length;

      // Category breakdown
      const categoryMap: Record<string, number> = {};
      allCourses.forEach(c => {
        categoryMap[c.category] = (categoryMap[c.category] ?? 0) + 1;
      });
      const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + "…" : name, value }));

      // Monthly enrollments (last 6 months)
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

      // Monthly signups
      const monthlySignups = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const monthStr = d.toLocaleString("default", { month: "short" });
        const count = allProfiles.filter(p => {
          const pd = new Date(p.created_at);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        }).length;
        return { month: monthStr, signups: count };
      });

      // Recent enrollments
      const recentEnrollments = allEnrollments.slice(0, 5);

      return {
        courses: allCourses.length,
        published: publishedCount,
        drafts: draftCount,
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
      };
    },
  });

  const statCards = [
    { label: "Total Courses", value: stats?.courses ?? 0, sub: `${stats?.published ?? 0} published`, icon: BookOpen, href: "/admin/courses" },
    { label: "Total Users", value: stats?.users ?? 0, sub: "registered accounts", icon: Users, href: "/admin/users" },
    { label: "Enrollments", value: stats?.enrollments ?? 0, sub: `${stats?.totalRevenue ?? 0} paid`, icon: GraduationCap, href: "/admin/enrollments" },
    { label: "Instructors", value: stats?.instructors ?? 0, sub: "active mentors", icon: UserCheck, href: "/admin/instructors" },
    { label: "Promo Codes", value: stats?.activePromos ?? 0, sub: `$${(stats?.promoRevenue ?? 0).toLocaleString()} revenue`, icon: Megaphone, href: "/admin/influencers-marketing" },
    { label: "Testimonials", value: stats?.testimonials ?? 0, sub: "published reviews", icon: MessageSquareQuote, href: "/admin/testimonials" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold mb-1">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">Welcome back. Here's what's happening with your platform.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={card.href}
              className="bg-card rounded-xl border border-border p-5 flex items-center gap-4 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all block"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <card.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{card.sub}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trends */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-sm">Enrollment Trends</h3>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.monthlyEnrollments ?? []}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Bar dataKey="enrollments" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course Categories */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-sm">Course Categories</h3>
              <p className="text-xs text-muted-foreground">Distribution by category</p>
            </div>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
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
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={70}
                        strokeWidth={2}
                      >
                        {(stats?.categoryData ?? []).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2">
                  {(stats?.categoryData ?? []).map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{cat.name}</span>
                      <span className="font-medium ml-auto">{cat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center w-full">No courses yet</p>
            )}
          </div>
        </div>
      </div>

      {/* User Growth + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-sm">User Growth</h3>
              <p className="text-xs text-muted-foreground">New signups per month</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.monthlySignups ?? []}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="signups" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Enrollments */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-sm">Recent Enrollments</h3>
              <p className="text-xs text-muted-foreground">Latest activity</p>
            </div>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-3">
            {(stats?.recentEnrollments ?? []).length > 0 ? (
              (stats?.recentEnrollments ?? []).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium font-mono">{e.course_id?.slice(0, 8)}...</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    e.payment_status === "confirmed" || e.payment_status === "paid"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {e.payment_status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No enrollments yet</p>
            )}
          </div>
          <Link to="/admin/enrollments" className="text-xs text-primary hover:underline mt-3 block">
            View all enrollments →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Add Course", href: "/admin/courses", icon: BookOpen },
            { label: "Add Instructor", href: "/admin/instructors", icon: UserCheck },
            { label: "Create Promo", href: "/admin/influencers-marketing", icon: Megaphone },
            { label: "Manage Content", href: "/admin/content", icon: CreditCard },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-center"
            >
              <action.icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
