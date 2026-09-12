import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shouldShowStagedFeature } from "@/lib/localhost-preview";
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Layers,
  GraduationCap
} from "lucide-react";
import { formatNaira } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";

const BOOTCAMP_4_WEEKS_ID = "099d5b38-4319-4849-acb2-380ea2eea9a5";

interface PromotedCourse {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  price: number | null;
  discount_price: number | null;
  thumbnail_url: string | null;
  duration_hours: number | null;
}

export function CoursesHeroBanner() {
  // Fetch active promoted config from site_content
  const { data: config } = useQuery({
    queryKey: ["promoted-courses-banner-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "promoted_courses_banner")
        .maybeSingle();

      if (data?.value) {
        try {
          return typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        } catch {}
      }
      return null;
    },
    staleTime: 60 * 1000,
  });

  const targetCourseId = (config?.courseIds && config.courseIds.length > 0)
    ? config.courseIds[0]
    : BOOTCAMP_4_WEEKS_ID;

  // Fetch course details
  const { data: course } = useQuery<PromotedCourse | null>({
    queryKey: ["course-hero-banner-item", targetCourseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, slug, description, category, difficulty, price, discount_price, thumbnail_url, duration_hours")
        .eq("id", targetCourseId)
        .maybeSingle();

      if (error || !data) return null;
      return data as PromotedCourse;
    },
    staleTime: 60 * 1000,
  });

  // Localhost gating check
  const isVisible = shouldShowStagedFeature(config?.showOnLocalhostOnly ?? true);
  if (!isVisible) return null;
  if (!course) return null;

  const courseUrl = course.slug ? `/courses/${course.slug}` : `/courses/${course.id}`;
  const effectivePrice = course.discount_price ?? course.price ?? 500000;
  const badgeLabel = config?.badgeText || "4-Week Intensive Bootcamp";

  return (
    <div className="mb-10 rounded-3xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 md:p-10 shadow-sm relative overflow-hidden">
      {/* Soft background accents */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Info Column */}
        <div className="lg:col-span-7 space-y-4 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{badgeLabel}</span>
            </span>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Enrolling Now • Limited Cohort Seats
            </span>
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
            {course.title}
          </h2>

          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
            {course.description || "Master enterprise Microsoft Azure architecture, compute, networking, security, automation, and CI/CD pipelines in an accelerated hands-on cohort."}
          </p>

          {/* Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>Live Cloud Consoles</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span>4 Weeks Live Cohort</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Verified Certificate</span>
            </div>
          </div>

          {/* Pricing & CTA */}
          <div className="flex flex-wrap items-center gap-4 pt-3">
            <Button size="lg" asChild className="gap-2 font-semibold hover-scale">
              <Link to={courseUrl}>
                <span>Enroll in 4-Week Bootcamp</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <div className="flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-bold text-foreground font-heading">
                {formatNaira(Number(effectivePrice))}
              </span>
              {course.discount_price && course.price && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatNaira(Number(course.price))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Thumbnail & Highlights Card */}
        <div className="lg:col-span-5 relative">
          <div className="rounded-2xl border border-border/80 bg-background/80 p-3 shadow-lg overflow-hidden group">
            <div className="relative rounded-xl overflow-hidden aspect-video bg-muted">
              {course.thumbnail_url ? (
                <img 
                  src={course.thumbnail_url} 
                  alt={course.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                  <GraduationCap className="h-12 w-12" />
                </div>
              )}
              <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-md border border-white/20">
                Live Cloud Labs
              </div>
            </div>

            <div className="p-3 pt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 mt-2">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>4-Week Intensive Track</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Beginner to Pro</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
