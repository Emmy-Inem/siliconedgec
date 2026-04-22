import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Star, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";
import type { DbCourse } from "@/hooks/useCourses";
import { formatNaira } from "@/lib/format-currency";

const difficultyColor: Record<string, string> = {
  Beginner: "bg-green-100 text-green-700",
  Intermediate: "bg-amber-100 text-amber-700",
  Expert: "bg-red-100 text-red-700",
};

export const CourseCard = forwardRef<HTMLDivElement, { course: DbCourse; index?: number }>(
  function CourseCard({ course, index = 0 }, ref) {
    const isWebinar = (course.price ?? 0) === 0 || course.title.toUpperCase().startsWith("FREE");
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        whileHover={{ y: -8, transition: { duration: 0.25, type: "spring", stiffness: 300 } }}
        transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
        viewport={{ once: true }}
      >
      <Link to={`/courses/${course.id}`} className="group block h-full">
        <div className="bg-card rounded-xl border border-border overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/10 group-hover:border-primary/30 h-full flex flex-col">
          {/* Thumbnail */}
          <div className="aspect-[16/10] sm:aspect-video bg-gradient-to-br from-navy to-navy-light relative overflow-hidden flex-shrink-0">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <span className="font-heading text-lg sm:text-2xl font-bold text-primary/60 text-center leading-tight">
                  {course.category}
                </span>
              </div>
            )}
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-2.5 right-2.5">
              <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${difficultyColor[course.difficulty] ?? ""}`}>
                {course.difficulty}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5 space-y-2.5 sm:space-y-3 flex flex-col flex-1">
            <h3 className="font-heading font-semibold text-sm sm:text-base text-card-foreground leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2">
              {course.title}
            </h3>

            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 flex-1">{course.description}</p>

            <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {course.duration_hours}h
              </span>
              {(course.rating ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-accent text-accent" />
                  {course.rating}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {(course.students_enrolled ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {course.instructor?.avatar_url ? (
                    <img src={course.instructor.avatar_url} alt={course.instructor.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-bold text-primary">
                      {(course.instructor?.name ?? "?").split(" ").map((n) => n[0]).join("")}
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground truncate">
                  {course.instructor?.name ?? "Instructor"}
                </span>
              </div>
              <span className="font-heading font-bold text-primary text-sm sm:text-base flex-shrink-0">
                {isWebinar ? (
                  <span className="text-green-600 dark:text-green-400">Free · Register</span>
                ) : (
                  formatNaira(course.price)
                )}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
    );
  }
);
