import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowRight, Route as RouteIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function LearningPaths() {
  const { data: paths } = useQuery({
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

  return (
    <>
      <SEO title="Career Learning Paths | Silicon Edge Consulting" description="Structured, role-based training paths for Cloud Engineers, Full-Stack Developers, and DevOps Specialists." canonical="https://siliconedgec.com/paths" />
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mb-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-2">Curated tracks</p>
          <h1 className="font-heading text-3xl md:text-5xl font-bold mb-3">Learning Paths</h1>
          <p className="text-muted-foreground">Follow a guided sequence of courses designed by our instructors. Each path builds skills progressively toward a career outcome.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(paths ?? []).map((p: any, i: number) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/paths/${p.id}`} className="block group rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/60 hover:shadow-lg transition-all h-full">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center mb-3"><RouteIcon className="h-5 w-5" /></div>
                <h2 className="font-heading text-lg font-bold mb-1">{p.title}</h2>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{p.description}</p>
                <p className="text-xs text-muted-foreground">{p.learning_path_courses?.length ?? 0} courses</p>
                <p className="text-primary text-sm font-medium inline-flex items-center mt-2">Explore path<ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" /></p>
              </Link>
            </motion.div>
          ))}
          {(paths?.length ?? 0) === 0 && <p className="text-muted-foreground">No learning paths published yet.</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}