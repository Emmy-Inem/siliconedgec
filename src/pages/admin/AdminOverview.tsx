import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users, GraduationCap, MessageSquareQuote, CreditCard, UserCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [courses, instructors, enrollments, testimonials, plans, profiles] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("instructors").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("testimonials").select("id", { count: "exact", head: true }),
        supabase.from("pricing_plans").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        courses: courses.count ?? 0,
        instructors: instructors.count ?? 0,
        enrollments: enrollments.count ?? 0,
        testimonials: testimonials.count ?? 0,
        plans: plans.count ?? 0,
        users: profiles.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Courses", value: stats?.courses ?? 0, icon: BookOpen, color: "text-primary" },
    { label: "Instructors", value: stats?.instructors ?? 0, icon: UserCheck, color: "text-primary" },
    { label: "Users", value: stats?.users ?? 0, icon: Users, color: "text-primary" },
    { label: "Enrollments", value: stats?.enrollments ?? 0, icon: GraduationCap, color: "text-primary" },
    { label: "Testimonials", value: stats?.testimonials ?? 0, icon: MessageSquareQuote, color: "text-primary" },
    { label: "Pricing Plans", value: stats?.plans ?? 0, icon: CreditCard, color: "text-primary" },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Dashboard Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
