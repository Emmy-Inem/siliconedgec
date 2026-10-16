import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Image, Eye, EyeOff, ExternalLink, Loader2, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { formatNaira } from "@/lib/format-currency";
import { logAdminActivity } from "@/lib/admin-logger";
import { courses as staticCourses } from "@/data/courses";
import type { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

export default function AdminCourses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: dbCourses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) {
        console.warn("Error fetching admin courses from DB:", error);
      }
      return data ?? [];
    },
  });

  // Seamlessly merge any static courses that aren't yet recorded in the DB
  const allCourses: Course[] = useMemo(() => {
    const existingIds = new Set(dbCourses.map((c) => c.id.toLowerCase()));
    const existingSlugs = new Set(dbCourses.map((c) => (c.slug || "").toLowerCase()).filter(Boolean));

    const extra: Course[] = staticCourses
      .filter((sc) => !existingIds.has(sc.id.toLowerCase()) && !existingSlugs.has((sc.slug || sc.id).toLowerCase()))
      .map((sc) => ({
        id: sc.id,
        slug: sc.slug || sc.id,
        title: sc.title,
        description: sc.description,
        category: sc.category,
        category_id: null,
        price: sc.price,
        discount_price: sc.discountPrice ?? null,
        early_bird_price: null,
        currency: "NGN",
        difficulty: sc.difficulty,
        duration_hours: sc.durationHours,
        thumbnail_url: sc.thumbnailUrl || null,
        rating: sc.rating,
        students_enrolled: sc.studentsEnrolled,
        learning_outcomes: sc.learningOutcomes,
        whats_included: sc.whatsIncluded ?? null,
        is_published: sc.isPublished !== false,
        status: sc.isPublished !== false ? "published" : "draft",
        instructor_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cohort_only: false,
        course_type: "virtual",
        product_type: "simple",
        discount_start: null,
        discount_end: null,
        max_enrollment: null,
        enrollment_start: null,
        enrollment_end: null,
        intro_video_url: null,
        purchase_note: null,
        enable_reviews: true,
        upsell_course_ids: [],
        cross_sell_course_ids: [],
      }));

    return [...dbCourses, ...extra];
  }, [dbCourses]);

  const toggleVisibility = useMutation({
    mutationFn: async ({ course, nextPublished }: { course: Course; nextPublished: boolean }) => {
      setTogglingId(course.id);
      const nextStatus = nextPublished ? "published" : "draft";

      // Check if course exists in DB
      const { data: existing } = await supabase.from("courses").select("id").eq("id", course.id).maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("courses")
          .update({
            is_published: nextPublished,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", course.id);
        if (error) throw error;
      } else {
        // Insert/upsert into courses table
        const { error } = await supabase.from("courses").upsert({
          ...course,
          is_published: nextPublished,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      await logAdminActivity(
        "update",
        "course",
        course.id,
        { action: nextPublished ? "unhide_course" : "hide_course", title: course.title, is_published: nextPublished }
      );
    },
    onSuccess: (_, { course, nextPublished }) => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast({
        title: nextPublished ? "Course is now visible" : "Course hidden from website",
        description: nextPublished
          ? `"${course.title}" is now visible to learners across the website.`
          : `"${course.title}" has been hidden from the public website, catalog, and search.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Could not update course visibility",
        description: err.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTogglingId(null);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      await logAdminActivity("delete", "course", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast({ title: "Course deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to delete course", description: e.message, variant: "destructive" });
    },
  });

  // Filter courses based on visibility selection
  const filteredCourses = useMemo(() => {
    if (visibilityFilter === "visible") {
      return allCourses.filter((c) => c.is_published === true);
    }
    if (visibilityFilter === "hidden") {
      return allCourses.filter((c) => c.is_published !== true);
    }
    return allCourses;
  }, [allCourses, visibilityFilter]);

  const visibleCount = useMemo(() => allCourses.filter((c) => c.is_published === true).length, [allCourses]);
  const hiddenCount = useMemo(() => allCourses.filter((c) => c.is_published !== true).length, [allCourses]);

  const columns: Column<Course>[] = [
    {
      key: "thumbnail_url",
      label: "Image",
      render: (c) =>
        c.thumbnail_url ? (
          <img src={c.thumbnail_url} alt={c.title} className="w-12 h-8 object-cover rounded shadow-sm" />
        ) : (
          <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
            <Image className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
    },
    {
      key: "title",
      label: "Title",
      render: (c) => (
        <div className="max-w-xs sm:max-w-sm">
          <div className="font-medium text-foreground truncate" title={c.title}>
            {c.title}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{c.slug || c.id}</div>
        </div>
      ),
    },
    { key: "category", label: "Category" },
    {
      key: "difficulty",
      label: "Level",
      render: (c) => (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            c.difficulty === "Beginner"
              ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
              : c.difficulty === "Intermediate"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
          }`}
        >
          {c.difficulty}
        </span>
      ),
    },
    { key: "price", label: "Price", render: (c) => formatNaira(Number(c.price)) },
    {
      key: "is_published",
      label: "Website Visibility",
      render: (c) => {
        const isToggling = togglingId === c.id;
        const isLive = c.is_published === true;
        return (
          <button
            type="button"
            disabled={isToggling}
            onClick={() => toggleVisibility.mutate({ course: c, nextPublished: !isLive })}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-sm ${
              isLive
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200 border border-amber-300 dark:border-amber-800"
            }`}
            title={isLive ? "Currently visible to public. Click to hide." : "Currently hidden from public. Click to show."}
          >
            {isToggling ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isLive ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <EyeOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            )}
            <span>{isLive ? "Visible" : "Hidden"}</span>
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Visibility Quick Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Filter Visibility:
          </span>
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setVisibilityFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                visibilityFilter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({allCourses.length})
            </button>
            <button
              type="button"
              onClick={() => setVisibilityFilter("visible")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                visibilityFilter === "visible"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Visible on Website ({visibleCount})
            </button>
            <button
              type="button"
              onClick={() => setVisibilityFilter("hidden")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                visibilityFilter === "hidden"
                  ? "bg-background text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              Hidden from Website ({hiddenCount})
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Click the <strong className="text-foreground">Visible/Hidden</strong> badge or action button to toggle course visibility on the website anytime.
        </div>
      </div>

      <AdminCrudTable
        title="Courses Management"
        data={filteredCourses}
        columns={columns}
        isLoading={isLoading}
        addLabel="Add New Course"
        onAdd={() => navigate("/admin/courses/new")}
        onEdit={(c) => navigate(`/admin/courses/${c.id}/edit`)}
        onDelete={(id) => del.mutate(id)}
        extraActions={(c) => {
          const isToggling = togglingId === c.id;
          const isLive = c.is_published === true;
          return (
            <div className="flex items-center gap-1 mr-1">
              <Button
                size="sm"
                variant={isLive ? "outline" : "default"}
                disabled={isToggling}
                onClick={() => toggleVisibility.mutate({ course: c, nextPublished: !isLive })}
                className={`text-xs h-7 px-2.5 font-medium transition-all ${
                  isLive
                    ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 border-amber-200 dark:border-amber-800"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                }`}
                title={isLive ? "Hide this course from website" : "Make this course visible on website"}
              >
                {isToggling ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : isLive ? (
                  <EyeOff className="h-3 w-3 mr-1" />
                ) : (
                  <Eye className="h-3 w-3 mr-1" />
                )}
                {isLive ? "Hide" : "Show"}
              </Button>

              <Link to={`/admin/courses/${c.id}/modules`}>
                <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                  Modules
                </Button>
              </Link>

              <a
                href={`/courses/${c.slug || c.id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Preview course on website"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          );
        }}
      />
    </div>
  );
}
