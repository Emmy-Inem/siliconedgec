import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { isLocalhost } from "@/lib/localhost-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Megaphone, 
  Save, 
  Loader2, 
  Search, 
  Check, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  Info,
  ShieldCheck,
  Eye,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { 
  PromotedBannerConfig, 
  DEFAULT_PROMOTED_BANNER_CONFIG 
} from "@/components/home/PromotedCoursesBanner";

interface CourseItem {
  id: string;
  title: string;
  category: string | null;
  difficulty: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
}

export function AdminPromotedBannerSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [config, setConfig] = useState<PromotedBannerConfig>(DEFAULT_PROMOTED_BANNER_CONFIG);
  const [searchQuery, setSearchQuery] = useState("");
  const [dirty, setDirty] = useState(false);

  // Fetch saved banner configuration
  const { data: savedData, isLoading: isConfigLoading } = useQuery({
    queryKey: ["promoted-courses-banner-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_content")
        .select("id, value")
        .eq("key", "promoted_courses_banner")
        .maybeSingle();

      if (data?.value) {
        try {
          const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          return { ...DEFAULT_PROMOTED_BANNER_CONFIG, ...parsed } as PromotedBannerConfig;
        } catch (e) {
          console.error("Failed to parse config:", e);
        }
      }
      return DEFAULT_PROMOTED_BANNER_CONFIG;
    },
  });

  // Fetch all published courses
  const { data: allCourses = [], isLoading: isCoursesLoading } = useQuery<CourseItem[]>({
    queryKey: ["admin-all-courses-for-promotion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, category, difficulty, thumbnail_url, is_published")
        .order("title");
      if (error) throw error;
      return (data as CourseItem[]) ?? [];
    },
  });

  useEffect(() => {
    if (savedData) {
      setConfig(savedData);
      setDirty(false);
    }
  }, [savedData]);

  // Selected courses list
  const selectedCourseIds = config.courseIds || [];
  const selectedCourses = selectedCourseIds
    .map((id) => allCourses.find((c) => c.id === id))
    .filter(Boolean) as CourseItem[];

  // Filter available courses for search
  const filteredAvailableCourses = allCourses.filter((course) => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.category && course.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleToggleCourse = (courseId: string) => {
    setDirty(true);
    setConfig((prev) => {
      const exists = prev.courseIds.includes(courseId);
      if (exists) {
        return {
          ...prev,
          courseIds: prev.courseIds.filter((id) => id !== courseId),
        };
      } else {
        return {
          ...prev,
          courseIds: [...prev.courseIds, courseId],
        };
      }
    });
  };

  const handleMoveCourse = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= config.courseIds.length) return;
    setDirty(true);
    const updated = [...config.courseIds];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    setConfig((prev) => ({ ...prev, courseIds: updated }));
  };

  const handleRemoveCourse = (courseId: string) => {
    setDirty(true);
    setConfig((prev) => ({
      ...prev,
      courseIds: prev.courseIds.filter((id) => id !== courseId),
    }));
  };

  // Mutation to save settings to site_content
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payloadString = JSON.stringify(config);
      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("key", "promoted_courses_banner")
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("site_content")
          .update({
            value: payloadString,
            content_type: "json",
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_content")
          .insert({
            key: "promoted_courses_banner",
            value: payloadString,
            content_type: "json",
          });
        if (error) throw error;
      }

      await logAdminActivity("update", "settings", undefined, {
        feature: "promoted_courses_banner",
        courseCount: config.courseIds.length,
        enabled: config.enabled,
        showOnLocalhostOnly: config.showOnLocalhostOnly,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promoted-courses-banner-config"] });
      qc.invalidateQueries({ queryKey: ["promoted-courses-list"] });
      setDirty(false);
      toast({
        title: "Promoted Course Settings Saved",
        description: "Your banner configuration is updated and saved.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to save settings",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (isConfigLoading || isCoursesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentlyOnLocalhost = isLocalhost();

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-xl font-bold text-foreground">
              Promoted Courses Announcement Banner
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Feature and push prioritized courses across the website header with custom call-to-actions.
          </p>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
          className="gap-2 shrink-0"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {dirty ? "Save Changes" : "Saved"}
        </Button>
      </div>

      {/* Localhost / Environment Warning Pill */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 text-xs">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <span>Staging Mode &amp; Localhost Protection</span>
            {config.showOnLocalhostOnly ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground border border-border">
                Localhost Only Active
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground border border-border">
                Public Live in Production
              </span>
            )}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {config.showOnLocalhostOnly
              ? "All banner displays and the 10-second For Business modal are restricted to localhost links until you are ready for full public rollout."
              : "The banner is live and visible to all site visitors on both localhost and production."}
            {currentlyOnLocalhost && " (You are currently viewing from localhost, so you can preview changes immediately)."}
          </p>
        </div>
      </div>

      {/* Master Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Activation & Scope */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <h3 className="font-heading font-semibold text-sm text-foreground">
            Display &amp; Visibility Controls
          </h3>

          <div className="flex items-center justify-between gap-4 py-2 border-b border-border/50">
            <div>
              <label className="text-xs font-medium text-foreground block">
                Enable Announcement Banner
              </label>
              <span className="text-[11px] text-muted-foreground">
                Turn the promoted course banner on or off globally.
              </span>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => {
                setDirty(true);
                setConfig((p) => ({ ...p, enabled: checked }));
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <label className="text-xs font-medium text-foreground block">
                Restrict to Localhost Only
              </label>
              <span className="text-[11px] text-muted-foreground">
                Keep visible only on localhost for testing. Turn off when ready to launch live.
              </span>
            </div>
            <Switch
              checked={config.showOnLocalhostOnly}
              onCheckedChange={(checked) => {
                setDirty(true);
                setConfig((p) => ({ ...p, showOnLocalhostOnly: checked }));
              }}
            />
          </div>
        </div>

        {/* Card: Messaging & Copy */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <h3 className="font-heading font-semibold text-sm text-foreground">
            Banner Messaging &amp; CTA
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Badge Tag Text
            </label>
            <Input
              value={config.badgeText}
              onChange={(e) => {
                setDirty(true);
                setConfig((p) => ({ ...p, badgeText: e.target.value }));
              }}
              placeholder="e.g. Enrolling Now, Featured Program, Next Cohort"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Custom Headline Prefix (Optional)
            </label>
            <Input
              value={config.customHeadline ?? ""}
              onChange={(e) => {
                setDirty(true);
                setConfig((p) => ({ ...p, customHeadline: e.target.value }));
              }}
              placeholder="e.g. Accelerate your cloud career with our live cohort"
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                CTA Button Text
              </label>
              <Input
                value={config.ctaText}
                onChange={(e) => {
                  setDirty(true);
                  setConfig((p) => ({ ...p, ctaText: e.target.value }));
                }}
                placeholder="View Curriculum"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Rotation Interval (Secs)
              </label>
              <Input
                type="number"
                min={3}
                max={30}
                value={config.rotationSeconds ?? 7}
                onChange={(e) => {
                  setDirty(true);
                  setConfig((p) => ({ ...p, rotationSeconds: parseInt(e.target.value) || 7 }));
                }}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Box */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm text-foreground flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-primary" /> Live Header Banner Preview
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {selectedCourses.length === 0 
              ? "No courses currently selected" 
              : `${selectedCourses.length} course${selectedCourses.length > 1 ? "s" : ""} selected for promotion`}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 text-slate-100 p-3 text-xs overflow-hidden">
          {selectedCourses.length > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700">
                  {config.badgeText || "Bootcamp Track"}
                </span>
                <span className="text-slate-300 truncate">
                  {config.customHeadline ? `${config.customHeadline.replace(/—/g, "-")} - ` : ""}
                  <strong className="text-white">{selectedCourses[0]?.title.replace(/—/g, "-")}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-foreground bg-primary px-2.5 py-1 rounded">
                  {config.ctaText || "View Bootcamp"} <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Preview</span>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-2 text-xs">
              Select at least one course below to enable the banner preview.
            </p>
          )}
        </div>
      </div>

      {/* Course Selection Section */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-5">
        <div>
          <h3 className="font-heading font-semibold text-sm text-foreground mb-1">
            Courses Currently Pushed ({selectedCourses.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Select one or more courses to push. If multiple courses are selected, they will automatically cycle as an interactive stacked card carousel on the Courses hero and top announcement banner.
          </p>
        </div>

        {/* Selected Courses List with ordering */}
        {selectedCourses.length > 0 ? (
          <div className="space-y-2">
            {selectedCourses.map((course, idx) => (
              <div
                key={course.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  {course.thumbnail_url ? (
                    <img 
                      src={course.thumbnail_url} 
                      alt={course.title} 
                      className="w-10 h-7 object-cover rounded border border-border/60 shrink-0" 
                    />
                  ) : (
                    <div className="w-10 h-7 rounded bg-muted flex items-center justify-center shrink-0">
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{course.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {course.category} • {course.difficulty}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveCourse(idx, "up")}
                    disabled={idx === 0}
                    className="h-7 w-7 p-0"
                    title="Move earlier in rotation"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveCourse(idx, "down")}
                    disabled={idx === selectedCourses.length - 1}
                    className="h-7 w-7 p-0"
                    title="Move later in rotation"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveCourse(course.id)}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    title="Remove from pushed courses"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
            No courses selected yet. Choose from the available catalog below.
          </div>
        )}

        {/* Catalog Search & Selection */}
        <div className="pt-4 border-t border-border/60 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-foreground">
              Select Courses from Catalog
            </span>
            <div className="relative w-64 max-w-full">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses by name or category..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredAvailableCourses.map((c) => {
              const isSelected = selectedCourseIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleToggleCourse(c.id)}
                  className={`text-left p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border/70 hover:border-primary/40 bg-background/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {c.thumbnail_url ? (
                      <img 
                        src={c.thumbnail_url} 
                        alt={c.title} 
                        className="w-8 h-8 rounded object-cover shrink-0" 
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <BookOpen className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.category || "General"}</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-border text-muted-foreground flex items-center justify-center hover:border-primary">
                        <Plus className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
