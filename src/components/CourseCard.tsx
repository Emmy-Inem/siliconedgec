import { Link } from "react-router-dom";
import { Star, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";
import type { DbCourse } from "@/hooks/useCourses";

const difficultyColor: Record<string, string> = {
  Beginner: "bg-green-100 text-green-700",
  Intermediate: "bg-amber-100 text-amber-700",
  Expert: "bg-red-100 text-red-700",
};

export function CourseCard({ course, index = 0 }: { course: DbCourse; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      viewport={{ once: true }}
    >
      <Link to={`/courses/${course.id}`} className="group block">
        <div className="bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/5 group-hover:-translate-y-1 group-hover:border-primary/30">
          <div className="aspect-video bg-gradient-to-br from-navy to-navy-light relative overflow-hidden">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-heading text-2xl font-bold text-primary/60">{course.category}</span>
              </div>
            )}
            <div className="absolute top-3 right-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${difficultyColor[course.difficulty] ?? ""}`}>
                {course.difficulty}
              </span>
            </div>
          </div>

          <div className="p-5 space-y-3">
            <h3 className="font-heading font-semibold text-card-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {course.title}
            </h3>

            <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {course.duration_hours}h
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                {course.rating ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {(course.students_enrolled ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">{course.instructor?.name ?? "Instructor"}</span>
              <span className="font-heading font-bold text-primary">${course.price}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
