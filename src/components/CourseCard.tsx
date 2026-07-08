import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Clock, Users, Star, Heart } from "lucide-react";
import { motion } from "framer-motion";
import type { DbCourse } from "@/hooks/useCourses";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";
import { StarRating } from "@/components/StarRating";
import { SafeImage } from "@/components/SafeImage";
import { courseHref } from "@/lib/course-url";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useAuth } from "@/contexts/AuthContext";
import { requestSignup } from "@/components/SignupPromptModal";
import { cn } from "@/lib/utils";
import instructor1 from "@/assets/stock/instructor-1.jpg";
import instructor2 from "@/assets/stock/instructor-2.jpg";
import instructor3 from "@/assets/stock/instructor-3.jpg";
import instructor4 from "@/assets/stock/instructor-4.jpg";

const FALLBACK_AVATARS = [instructor1, instructor2, instructor3, instructor4];

/** Deterministic avatar fallback so every card shows a real face. */
function pickFallbackAvatar(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return FALLBACK_AVATARS[hash % FALLBACK_AVATARS.length];
}

const difficultyColor: Record<string, string> = {
  Beginner: "bg-green-100 text-green-700",
  Intermediate: "bg-amber-100 text-amber-700",
  Expert: "bg-red-100 text-red-700",
};

export const CourseCard = forwardRef<HTMLDivElement, { course: DbCourse; index?: number }>(
  function CourseCard({ course, index = 0 }, ref) {
    const isWebinar = (course.price ?? 0) === 0 || course.title.toUpperCase().startsWith("FREE");
    const { format } = useLocalizedPrice();
    const { user } = useAuth();
    const { isBookmarked, toggleBookmark, isToggling } = useBookmarks();
    const favorited = isBookmarked(course.id);
    const handleFavorite = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) { requestSignup("bookmark"); return; }
      toggleBookmark(course.id);
    };
    const instructorName = course.instructor?.name && course.instructor.name.toLowerCase() !== "silicon-edge"
      ? course.instructor.name
      : "Silicon Edge Mentor";
    const instructorAvatar = course.instructor?.avatar_url && course.instructor.avatar_url.trim().length > 0
      ? course.instructor.avatar_url
      : pickFallbackAvatar(course.instructor?.id ?? course.id);
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        whileHover={{ y: -8, transition: { duration: 0.25, type: "spring", stiffness: 300 } }}
        transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
        viewport={{ once: true }}
      >
      <Link to={courseHref(course)} className="group block h-full">
        <div className="bg-card rounded-xl border border-border overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/10 group-hover:border-primary/30 h-full flex flex-col">
          {/* Thumbnail */}
          <div className="aspect-[16/10] sm:aspect-video bg-gradient-to-br from-navy to-navy-light relative overflow-hidden flex-shrink-0">
            {course.thumbnail_url ? (
              <SafeImage
                src={course.thumbnail_url}
                fallback={pickFallbackAvatar(course.id)}
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
            {isWebinar && (
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-lg">
                <Star className="h-3 w-3" />
                Free webinar
              </div>
            )}
            <div className="absolute top-2.5 right-2.5">
              <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${difficultyColor[course.difficulty] ?? ""}`}>
                {course.difficulty}
              </span>
            </div>
            <button
              type="button"
              onClick={handleFavorite}
              disabled={isToggling}
              aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={favorited}
              className={cn(
                "absolute bottom-2.5 right-2.5 p-2 rounded-full bg-white/90 backdrop-blur shadow-md transition-all hover:scale-110 hover:bg-white z-10",
                favorited ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              )}
            >
              <Heart className={cn("h-4 w-4", favorited && "fill-current")} />
            </button>
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
                <StarRating value={course.rating ?? 0} size="sm" showValue />
              )}
              {(course.students_enrolled ?? 0) >= 5 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {(course.students_enrolled ?? 0).toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 ring-2 ring-background shadow-md border border-primary/15">
                  <SafeImage
                    src={instructorAvatar}
                    fallback={pickFallbackAvatar(course.id)}
                    alt={instructorName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Instructor</span>
                  <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                    {instructorName}
                  </span>
                </div>
              </div>
              <span className="font-heading font-bold text-primary text-sm sm:text-base flex-shrink-0">
                {isWebinar ? (
                  <span className="text-primary">Free · Register</span>
                ) : (
                  format(course.price)
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
