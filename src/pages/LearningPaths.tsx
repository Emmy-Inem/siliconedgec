import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Route as RouteIcon,
  Cloud,
  Code2,
  Terminal,
  Database,
  Brain,
  ShieldCheck,
  BookOpen,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";

const iconFor = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("devops")) return Terminal;
  if (t.includes("data")) return Database;
  if (t.includes("ai") || t.includes("machine")) return Brain;
  if (t.includes("cyber") || t.includes("security")) return ShieldCheck;
  if (t.includes("cloud") || t.includes("aws") || t.includes("google") || t.includes("azure")) return Cloud;
  if (t.includes("stack") || t.includes("python") || t.includes("developer")) return Code2;
  return RouteIcon;
};

export default function LearningPaths() {
  const { data: paths, isLoading } = useQuery({
    queryKey: ["learning-paths-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("learning_paths")
        .select("id, title, description, order_index, learning_path_courses(course_id, order_index)")
        .eq("is_published", true)
        .order("order_index");
      return data ?? [];
    },
  });

  const { data: courseMeta } = useQuery({
    queryKey: ["learning-path-course-meta"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, duration_hours, difficulty")
        .eq("is_published", true);
      const map: Record<string, { hours: number; difficulty: string }> = {};
      (data ?? []).forEach((c: any) => {
        map[c.id] = { hours: Number(c.duration_hours ?? 0), difficulty: c.difficulty ?? "" };
      });
      return map;
    },
  });

  const statsFor = (p: any) => {
    const ids: string[] = (p.learning_path_courses ?? []).map((c: any) => c.course_id);
    const hours = ids.reduce((sum, id) => sum + (courseMeta?.[id]?.hours ?? 0), 0);
    const levels = ids.map((id) => courseMeta?.[id]?.difficulty).filter(Boolean);
    const level = levels.includes("Beginner") ? "Beginner friendly" : levels[0] ?? "All levels";
    return { count: ids.length, hours: Math.round(hours), level };
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Career Learning Paths | Silicon Edge Consulting"
        description="Structured, role-based training paths for Cloud Engineers, DevOps, Data Engineers, AI/ML, Cybersecurity and Full-Stack Developers."
        canonical="https://siliconedgec.com/paths"
      />
      <Header />

      {/* Hero — matches the site-wide page hero pattern */}
      <section className="relative overflow-hidden bg-white pt-28 pb-14 md:pt-36 md:pb-20 border-b border-border/40">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.10),transparent_60%)]"
        />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">Curated tracks</p>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Learning Paths
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Follow a guided sequence of courses designed by our instructors. Each path builds skills progressively
              toward a specific career outcome — from your first cloud console to a job-ready portfolio.
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl border border-border/60 bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (paths?.length ?? 0) === 0 ? (
          <p className="text-muted-foreground">No learning paths published yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(paths ?? []).map((p: any, i: number) => {
              const Icon = iconFor(p.title);
              const { count, hours, level } = statsFor(p);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 6) * 0.05 }}
                >
                  <Link
                    to={`/paths/${p.id}`}
                    className="flex flex-col h-full group rounded-2xl border border-border/60 bg-card p-6 hover:border-primary/60 hover:shadow-lg transition-all"
                  >
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-primary-foreground flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="font-heading text-lg font-bold mb-2">{p.title}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{p.description}</p>

                    <div className="mt-auto space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          <BookOpen className="h-3 w-3" aria-hidden="true" /> {count} {count === 1 ? "course" : "courses"}
                        </span>
                        {hours > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                            <Clock className="h-3 w-3" aria-hidden="true" /> {hours}h
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                          {level}
                        </span>
                      </div>
                      <span className="text-primary text-sm font-medium inline-flex items-center">
                        Explore path
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
