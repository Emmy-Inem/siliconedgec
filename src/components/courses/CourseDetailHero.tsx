import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Users } from "lucide-react";
import { StarRating } from "@/components/StarRating";

const difficultyIcon: Record<string, string> = {
  Beginner: "▎",
  Intermediate: "▎▎",
  Expert: "▎▎▎",
};

interface CourseDetailHeroProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    difficulty: string;
    students_enrolled?: number | null;
    rating?: number | null;
  };
  hours: number;
  minutes: number;
  avgRating: number;
  reviewCount: number;
}

export function CourseDetailHero({
  course,
  hours,
  minutes,
  avgRating,
  reviewCount,
}: CourseDetailHeroProps) {
  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-14 border-b border-border/40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--primary) / 0.14) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
        }}
      />
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
      <div className="container mx-auto px-4 relative">
        <Link to="/courses" className="inline-flex items-center text-muted-foreground hover:text-primary text-sm mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Courses
        </Link>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 60, damping: 18 }}>
          <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 max-w-3xl leading-[1.1] tracking-tight">
            {course.title}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mb-6">{course.description}</p>
          <div className="flex flex-wrap items-center gap-4 md:gap-6 text-muted-foreground text-sm">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {hours > 0 && `${hours} hours`} {minutes > 0 && `${minutes} minutes`}
            </span>
            {(course.students_enrolled ?? 0) >= 5 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {(course.students_enrolled ?? 0)} Enrolled
              </span>
            )}
            {(avgRating > 0 || (course.rating ?? 0) > 0) && (
              <span className="flex items-center gap-1.5">
                <StarRating value={avgRating || course.rating || 0} size="md" />
                <span>{(avgRating || course.rating || 0).toFixed(1)}{reviewCount ? ` (${reviewCount})` : ""}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-mono">{difficultyIcon[course.difficulty] ?? "▎"}</span>
              {course.difficulty}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
