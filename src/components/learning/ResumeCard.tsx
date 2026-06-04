import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";

export function ResumeCard({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["resume-card", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("course_id, last_lesson_id, last_seen_at, progress_percentage, is_completed, courses(slug, title, thumbnail_url)")
        .eq("user_id", userId)
        .eq("is_completed", false)
        .not("last_lesson_id", "is", null)
        .order("last_seen_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (!data) return null;
  const c: any = data.courses;
  if (!c) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent p-4 md:p-5 flex items-center gap-4">
      {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title} className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover" />}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-500 font-semibold">Resume where you left off</p>
        <p className="font-heading text-base md:text-lg font-bold truncate">{c.title}</p>
        <p className="text-xs text-muted-foreground">{Math.round(Number(data.progress_percentage ?? 0))}% complete</p>
      </div>
      <Button asChild size="sm">
        <Link to={`/courses/${c.slug ?? data.course_id}/learn${data.last_lesson_id ? `?lesson=${data.last_lesson_id}` : ""}`}>
          <PlayCircle className="h-4 w-4 mr-1" />Continue<ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </motion.div>
  );
}