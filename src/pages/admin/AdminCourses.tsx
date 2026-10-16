import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Image,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  CheckCircle2,
  SlidersHorizontal,
  Tag,
  Pencil,
  Check,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { formatNaira } from "@/lib/format-currency";
import { logAdminActivity } from "@/lib/admin-logger";
import { courses as staticCourses } from "@/data/courses";
import type { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DISMISSED_KEY = "admin_dismissed_courses";

function getDismissedCourseIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const COMMON_PRICE_PRESETS = [0, 25000, 35000, 45000, 60000, 75000, 100000, 150000];

export default function AdminCourses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedCourseIds);

  // Quick Price Modal State
  const [priceModalCourse, setPriceModalCourse] = useState<Course | null>(null);
  const [priceInput, setPriceInput] = useState<string>("");
  const [discountPriceInput, setDiscountPriceInput] = useState<string>("");

  const markCourseDismissed = (id: string, slug?: string) => {
    setDismissedIds((prev) => {
      const updated = Array.from(
        new Set([...prev, id.toLowerCase(), ...(slug ? [slug.toLowerCase()] : [])])
      );
      try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to save dismissed courses to localStorage:", err);
      }
      return updated;
    });
  };

  const { data: dbCourses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Error fetching admin courses from DB:", error);
      }
      return data ?? [];
    },
  });

  // Seamlessly merge any static courses that aren't yet recorded in DB,
  // excluding any courses that have been dismissed/deleted by the admin.
  const allCourses: Course[] = useMemo(() => {
    const dismissedSet = new Set(dismissedIds.map((id) => id.toLowerCase()));
    const existingIds = new Set(dbCourses.map((c) => c.id.toLowerCase()));
    const existingSlugs = new Set(
      dbCourses.map((c) => (c.slug || "").toLowerCase()).filter(Boolean)
    );

    const extra: Course[] = staticCourses
      .filter((sc) => {
        const idLower = sc.id.toLowerCase();
        const slugLower = (sc.slug || sc.id).toLowerCase();
        if (dismissedSet.has(idLower) || dismissedSet.has(slugLower)) return false;
        return !existingIds.has(idLower) && !existingSlugs.has(slugLower);
      })
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

    const filteredDb = dbCourses.filter(
      (c) => !dismissedSet.has(c.id.toLowerCase()) && !dismissedSet.has((c.slug || "").toLowerCase())
    );

    return [...filteredDb, ...extra];
  }, [dbCourses, dismissedIds]);

  const toggleVisibility = useMutation({
    mutationFn: async ({ course, nextPublished }: { course: Course; nextPublished: boolean }) => {
      setTogglingId(course.id);
      const nextStatus = nextPublished ? "published" : "draft";
      const isUuid = UUID_REGEX.test(course.id);

      // Check if course exists in DB
      let existingInDb = false;
      let targetDbId = course.id;

      if (isUuid) {
        const { data: existing } = await supabase
          .from("courses")
          .select("id")
          .eq("id", course.id)
          .maybeSingle();
        if (existing) existingInDb = true;
      } else {
        const { data: existing } = await supabase
          .from("courses")
          .select("id")
          .eq("slug", course.slug || course.id)
          .maybeSingle();
        if (existing) {
          existingInDb = true;
          targetDbId = existing.id;
        }
      }

      if (existingInDb) {
        const { error } = await supabase
          .from("courses")
          .update({
            is_published: nextPublished,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetDbId);
        if (error) throw error;
      } else {
        // Upsert course row into courses table
        const newId = isUuid ? course.id : crypto.randomUUID();
        const { error } = await supabase.from("courses").upsert({
          ...course,
          id: newId,
          slug: course.slug || course.id,
          is_published: nextPublished,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      await logAdminActivity("update", "course", course.id, {
        action: nextPublished ? "unhide_course" : "hide_course",
        title: course.title,
        is_published: nextPublished,
      });
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
      const course = allCourses.find((c) => c.id === id || c.slug === id);
      const isUuid = UUID_REGEX.test(id);

      if (isUuid) {
        // Clean up course_tags first if any exist
        await supabase.from("course_tags").delete().eq("course_id", id);
        const { error } = await supabase.from("courses").delete().eq("id", id);
        if (error && error.code !== "PGRST116") {
          console.warn("Delete by ID error:", error);
        }
      } else {
        // Try deleting by slug or handle gracefully
        const { error } = await supabase.from("courses").delete().eq("slug", id);
        if (error && error.code !== "PGRST116") {
          console.warn("Delete by slug error:", error);
        }
      }

      // Persistently dismiss so client-merged static courses vanish immediately
      markCourseDismissed(id, course?.slug ?? undefined);
      await logAdminActivity("delete", "course", id, { title: course?.title });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast({
        title: "Course removed",
        description: "The course has been successfully removed.",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Failed to remove course",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  // Quick Price Edit Mutation
  const updatePriceMutation = useMutation({
    mutationFn: async ({
      course,
      price,
      discountPrice,
    }: {
      course: Course;
      price: number;
      discountPrice: number | null;
    }) => {
      const isUuid = UUID_REGEX.test(course.id);
      let targetDbId: string | null = null;

      if (isUuid) {
        const { data } = await supabase
          .from("courses")
          .select("id")
          .eq("id", course.id)
          .maybeSingle();
        if (data) targetDbId = data.id;
      } else {
        const { data } = await supabase
          .from("courses")
          .select("id")
          .eq("slug", course.slug || course.id)
          .maybeSingle();
        if (data) targetDbId = data.id;
      }

      if (targetDbId) {
        const { error } = await supabase
          .from("courses")
          .update({
            price,
            discount_price: discountPrice,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetDbId);
        if (error) throw error;
      } else {
        // Course was only static, insert/upsert into courses table
        const newId = isUuid ? course.id : crypto.randomUUID();
        const { error } = await supabase.from("courses").upsert({
          ...course,
          id: newId,
          slug: course.slug || course.id,
          price,
          discount_price: discountPrice,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      await logAdminActivity("update", "course", course.id, {
        action: "quick_edit_price",
        title: course.title,
        price,
        discount_price: discountPrice,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast({
        title: "Price updated successfully!",
        description: `Price for "${vars.course.title}" is now ${formatNaira(vars.price)}${
          vars.discountPrice ? ` (was ${formatNaira(vars.discountPrice)})` : ""
        }.`,
      });
      setPriceModalCourse(null);
    },
    onError: (err: any) => {
      toast({
        title: "Could not update price",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenPriceModal = (course: Course) => {
    setPriceModalCourse(course);
    setPriceInput(course.price != null ? String(course.price) : "0");
    setDiscountPriceInput(course.discount_price != null ? String(course.discount_price) : "");
  };

  const handleSavePrice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!priceModalCourse) return;

    const parsedPrice = parseFloat(priceInput);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid non-negative selling price.",
        variant: "destructive",
      });
      return;
    }

    const parsedDiscountPrice = discountPriceInput.trim()
      ? parseFloat(discountPriceInput)
      : null;

    if (parsedDiscountPrice !== null && (isNaN(parsedDiscountPrice) || parsedDiscountPrice < 0)) {
      toast({
        title: "Invalid original price",
        description: "Original/strikethrough price must be a valid number.",
        variant: "destructive",
      });
      return;
    }

    updatePriceMutation.mutate({
      course: priceModalCourse,
      price: parsedPrice,
      discountPrice: parsedDiscountPrice,
    });
  };

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

  const visibleCount = useMemo(
    () => allCourses.filter((c) => c.is_published === true).length,
    [allCourses]
  );
  const hiddenCount = useMemo(
    () => allCourses.filter((c) => c.is_published !== true).length,
    [allCourses]
  );

  const columns: Column<Course>[] = [
    {
      key: "thumbnail_url",
      label: "Image",
      render: (c) =>
        c.thumbnail_url ? (
          <img
            src={c.thumbnail_url}
            alt={c.title}
            className="w-12 h-8 object-cover rounded shadow-sm"
          />
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
    {
      key: "price",
      label: "Price",
      render: (c) => (
        <button
          type="button"
          onClick={() => handleOpenPriceModal(c)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20 hover:border-primary/40 group cursor-pointer text-left"
          title="Click to quickly edit price"
        >
          <div className="flex flex-col">
            <span className="font-bold">{formatNaira(Number(c.price))}</span>
            {c.discount_price && Number(c.discount_price) > Number(c.price) && (
              <span className="text-[10px] line-through text-muted-foreground opacity-80">
                {formatNaira(Number(c.discount_price))}
              </span>
            )}
          </div>
          <Pencil className="w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
      ),
    },
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
            title={
              isLive
                ? "Currently visible to public. Click to hide."
                : "Currently hidden from public. Click to show."
            }
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

  // Helper calculations for price modal preview
  const previewSellingPrice = parseFloat(priceInput) || 0;
  const previewDiscountPrice = discountPriceInput.trim()
    ? parseFloat(discountPriceInput) || 0
    : 0;
  const hasDiscount = previewDiscountPrice > previewSellingPrice;
  const discountPercent = hasDiscount
    ? Math.round(((previewDiscountPrice - previewSellingPrice) / previewDiscountPrice) * 100)
    : 0;

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
          Tip: Click any course <strong className="text-foreground">Price</strong> or the <strong className="text-foreground">Price</strong> button to instantly update pricing.
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
              {/* Quick Edit Price Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenPriceModal(c)}
                className="text-xs h-7 px-2.5 font-medium border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                title="Quickly edit course price"
              >
                <Tag className="h-3 w-3 mr-1" />
                Price
              </Button>

              {/* Website Visibility Toggle */}
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
                title={
                  isLive
                    ? "Hide this course from website"
                    : "Make this course visible on website"
                }
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

      {/* ─── QUICK EDIT PRICE DIALOG ─── */}
      <Dialog
        open={!!priceModalCourse}
        onOpenChange={(open) => {
          if (!open) setPriceModalCourse(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Quick Edit Price</DialogTitle>
                <DialogDescription className="text-xs line-clamp-1 mt-0.5">
                  {priceModalCourse?.title}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSavePrice} className="space-y-4 py-2">
            {/* Live Pricing Preview Card */}
            <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Learner Display Preview:
              </span>
              <div className="flex items-baseline gap-2.5">
                <span className="text-xl font-bold text-foreground">
                  {previewSellingPrice === 0 ? "FREE" : formatNaira(previewSellingPrice)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-sm line-through text-muted-foreground">
                      {formatNaira(previewDiscountPrice)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <TrendingDown className="w-3 h-3" />
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Learners will be charged{" "}
                <strong className="text-foreground">
                  {previewSellingPrice === 0 ? "₦0 (Free)" : formatNaira(previewSellingPrice)}
                </strong>{" "}
                at checkout.
              </p>
            </div>

            {/* Selling Price Input */}
            <div className="space-y-1.5">
              <Label htmlFor="selling-price" className="text-xs font-semibold">
                Selling Price (₦) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                  ₦
                </span>
                <Input
                  id="selling-price"
                  type="number"
                  min="0"
                  step="500"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="e.g. 45000"
                  className="pl-8 text-base font-semibold"
                  autoFocus
                />
              </div>
            </div>

            {/* Price Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground block">
                Quick Price Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PRICE_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPriceInput(String(val))}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                      parseFloat(priceInput) === val
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                    }`}
                  >
                    {val === 0 ? "Free" : formatNaira(val)}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Original / Strike-through Price */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label htmlFor="discount-price" className="text-xs font-semibold">
                  Original / Strikethrough Price (₦)
                </Label>
                <span className="text-[11px] text-muted-foreground">(Optional)</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                  ₦
                </span>
                <Input
                  id="discount-price"
                  type="number"
                  min="0"
                  step="500"
                  value={discountPriceInput}
                  onChange={(e) => setDiscountPriceInput(e.target.value)}
                  placeholder="e.g. 75000 (shows strike-through discount)"
                  className="pl-8 text-sm"
                />
              </div>

              {/* Quick Strikethrough Discount Presets */}
              {previewSellingPrice > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground mr-1">Set Strikethrough:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountPriceInput(String(Math.round(previewSellingPrice * 1.25)))
                    }
                    className="px-2 py-0.5 rounded text-[11px] bg-muted hover:bg-accent text-foreground border border-border transition-colors"
                  >
                    +25% ({formatNaira(Math.round(previewSellingPrice * 1.25))})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountPriceInput(String(Math.round(previewSellingPrice * 1.5)))
                    }
                    className="px-2 py-0.5 rounded text-[11px] bg-muted hover:bg-accent text-foreground border border-border transition-colors"
                  >
                    +50% ({formatNaira(Math.round(previewSellingPrice * 1.5))})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountPriceInput(String(Math.round(previewSellingPrice * 2)))
                    }
                    className="px-2 py-0.5 rounded text-[11px] bg-muted hover:bg-accent text-foreground border border-border transition-colors"
                  >
                    2x ({formatNaira(Math.round(previewSellingPrice * 2))})
                  </button>
                  {discountPriceInput && (
                    <button
                      type="button"
                      onClick={() => setDiscountPriceInput("")}
                      className="px-1.5 py-0.5 rounded text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPriceModalCourse(null)}
                disabled={updatePriceMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updatePriceMutation.isPending}
                className="gap-1.5"
              >
                {updatePriceMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Price
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
