import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shouldShowStagedFeature } from "@/lib/localhost-preview";
import { 
  ArrowRight, 
  X, 
  ChevronLeft, 
  ChevronRight,
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PromotedBannerConfig {
  enabled: boolean;
  badgeText: string;
  customHeadline?: string;
  courseIds: string[];
  ctaText: string;
  showOnLocalhostOnly: boolean;
  rotationSeconds?: number;
}

export const BOOTCAMP_4_WEEKS_ID = "3b1f29ec-8fd4-4ff0-9357-1987b90e6c91";

export const DEFAULT_PROMOTED_BANNER_CONFIG: PromotedBannerConfig = {
  enabled: true,
  badgeText: "Bootcamp Track",
  customHeadline: "One-Month Cloud Engineering Bootcamp - Microsoft Azure",
  courseIds: [BOOTCAMP_4_WEEKS_ID],
  ctaText: "View Bootcamp",
  showOnLocalhostOnly: false,
  rotationSeconds: 7,
};

interface PromotedCourseItem {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  difficulty: string | null;
  price: number | null;
  discount_price: number | null;
  duration_hours: number | null;
}

export function PromotedCoursesBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("dismissed_promoted_courses_banner") === "true";
  });

  // Fetch admin settings from site_content
  const { data: config = DEFAULT_PROMOTED_BANNER_CONFIG } = useQuery({
    queryKey: ["promoted-courses-banner-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "promoted_courses_banner")
        .maybeSingle();

      if (data?.value) {
        try {
          const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          return { ...DEFAULT_PROMOTED_BANNER_CONFIG, ...parsed } as PromotedBannerConfig;
        } catch (e) {
          console.error("Failed to parse promoted courses banner config:", e);
        }
      }
      return DEFAULT_PROMOTED_BANNER_CONFIG;
    },
    staleTime: 60 * 1000,
  });

  // Fetch courses that match the selected courseIds (fallback to 4-Week Bootcamp if empty)
  const courseIds = (config.courseIds && config.courseIds.length > 0)
    ? config.courseIds
    : [BOOTCAMP_4_WEEKS_ID];

  const { data: courses = [] } = useQuery<PromotedCourseItem[]>({
    queryKey: ["promoted-courses-list", courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, slug, category, difficulty, price, discount_price, duration_hours")
        .in("id", courseIds)
        .eq("is_published", true);

      if (error) throw error;
      return (data as PromotedCourseItem[]) ?? [];
    },
    staleTime: 60 * 1000,
  });

  // Automatically cycle through courses if more than one is selected
  useEffect(() => {
    if (courses.length <= 1) return;
    const intervalTime = Math.max((config.rotationSeconds ?? 7) * 1000, 3000);
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % courses.length);
    }, intervalTime);
    return () => clearInterval(timer);
  }, [courses.length, config.rotationSeconds]);

  // Keep index within range
  useEffect(() => {
    if (currentIndex >= courses.length && courses.length > 0) {
      setCurrentIndex(0);
    }
  }, [courses.length, currentIndex]);

  // Handle dismissal
  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("dismissed_promoted_courses_banner", "true");
    } catch {}
  };

  // Localhost only gate as requested by user
  const isVisibleInCurrentEnv = shouldShowStagedFeature(config.showOnLocalhostOnly);

  if (isDismissed) return null;
  if (!config.enabled) return null;
  if (!isVisibleInCurrentEnv) return null;
  if (courses.length === 0) return null;

  const currentCourse = courses[currentIndex] || courses[0];
  const courseUrl = currentCourse.slug ? `/courses/${currentCourse.slug}` : `/courses/${currentCourse.id}`;

  return (
    <aside 
      aria-label="Promoted Course Announcement"
      className="relative z-40 bg-slate-900 text-slate-100 border-b border-slate-800/90 text-xs py-2 px-4 select-none transition-all duration-300"
    >
      <div className="container mx-auto flex items-center justify-between gap-3">
        {/* Left / Center content: strict single row (flex-nowrap) with smooth horizontal scrolling if text overflows */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 flex-nowrap overflow-x-auto scrollbar-none py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Badge: clean executive styling, no sparkles or colorful pills */}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-slate-800 text-slate-200 border border-slate-700 shrink-0">
              <span>{config.badgeText || "Bootcamp Track"}</span>
            </span>

            {/* Headline / Course Link */}
            <div className="flex items-center gap-1.5 text-slate-200 text-xs shrink-0">
              {config.customHeadline && (
                <span className="text-slate-400 font-normal shrink-0">
                  {config.customHeadline.replace(/—/g, "-")} -
                </span>
              )}
              <Link 
                to={courseUrl}
                className="font-semibold text-white hover:text-primary underline-offset-4 hover:underline transition-colors flex items-center gap-1.5 shrink-0"
              >
                <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{currentCourse.title.replace(/—/g, "-")}</span>
              </Link>

              {currentCourse.duration_hours ? (
                <span className="inline-flex text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded ml-1 border border-slate-700/60 shrink-0">
                  {currentCourse.duration_hours}h intensive
                </span>
              ) : (
                <span className="inline-flex text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded ml-1 border border-slate-700/60 shrink-0">
                  4 Weeks Live
                </span>
              )}
            </div>

            {/* CTA Link */}
            <Link
              to={courseUrl}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 px-2.5 py-1 rounded-md transition-colors shrink-0 shadow-sm"
            >
              <span>{config.ctaText || "View Bootcamp"}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Right Controls: Carousel arrows (if > 1) & Dismiss Button */}
        <div className="flex items-center gap-1 shrink-0">
          {courses.length > 1 && (
            <div className="flex items-center gap-0.5 mr-1 text-slate-400">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev - 1 + courses.length) % courses.length)}
                aria-label="Previous promoted course"
                className="p-1 rounded hover:bg-slate-800 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] tabular-nums text-slate-400 px-0.5">
                {currentIndex + 1}/{courses.length}
              </span>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % courses.length)}
                aria-label="Next promoted course"
                className="p-1 rounded hover:bg-slate-800 hover:text-white transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss announcement banner"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
