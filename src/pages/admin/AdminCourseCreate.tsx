import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Upload, Image, Loader2, Save, Send, Video, FileAudio, File, X
} from "lucide-react";
import { formatNaira } from "@/lib/format-currency";
import { logAdminActivity } from "@/lib/admin-logger";
import { CurriculumBuilder } from "@/components/admin/CurriculumBuilder";

const STEPS = [
  { label: "Basics" },
  { label: "Curriculum" },
  { label: "Additional" },
];

const PRODUCT_TYPES = ["Simple Product", "Grouped Product", "External Product", "Variable Product"];
const COURSE_TYPES = ["Virtual Course", "Downloadable Course", "Tutor-Led Program"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Expert"];

const inputClass = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function AdminCourseCreate() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const isEditing = !!courseId;
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const [form, setForm] = useState({
    // Step 1
    product_type: "Simple Product",
    course_type: "Virtual Course",
    title: "",
    description: "",
    category: "",
    category_id: null as string | null,
    difficulty: "Beginner",
    duration_hours: 10,
    learning_outcomes: "",
    // Step 2
    thumbnail_url: null as string | null,
    intro_video_url: "",
    price: 0,
    discount_price: null as number | null,
    early_bird_price: null as number | null,
    currency: "NGN",
    discount_start: "",
    discount_end: "",
    // Step 3
    max_enrollment: null as number | null,
    enrollment_start: "",
    enrollment_end: "",
    upsell_course_ids: [] as string[],
    cross_sell_course_ids: [] as string[],
    // Step 4
    purchase_note: "",
    enable_reviews: true,
    status: "draft",
    instructor_id: null as string | null,
    // Tags
    tag_ids: [] as string[],
  });

  // Load existing course for editing
  const { data: existingCourse } = useQuery({
    queryKey: ["admin-course-edit", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingCourse) {
      setForm({
        product_type: (existingCourse as any).product_type || "Simple Product",
        course_type: (existingCourse as any).course_type || "Virtual Course",
        title: existingCourse.title,
        description: existingCourse.description ?? "",
        category: existingCourse.category,
        category_id: existingCourse.category_id ?? null,
        difficulty: existingCourse.difficulty,
        duration_hours: Number(existingCourse.duration_hours),
        learning_outcomes: (existingCourse.learning_outcomes ?? []).join("\n"),
        thumbnail_url: existingCourse.thumbnail_url ?? null,
        intro_video_url: (existingCourse as any).intro_video_url ?? "",
        price: Number(existingCourse.price),
        discount_price: (existingCourse as any).discount_price ? Number((existingCourse as any).discount_price) : null,
        early_bird_price: (existingCourse as any).early_bird_price ? Number((existingCourse as any).early_bird_price) : null,
        currency: (existingCourse as any).currency ?? "NGN",
        discount_start: (existingCourse as any).discount_start ?? "",
        discount_end: (existingCourse as any).discount_end ?? "",
        max_enrollment: (existingCourse as any).max_enrollment ?? null,
        enrollment_start: (existingCourse as any).enrollment_start ?? "",
        enrollment_end: (existingCourse as any).enrollment_end ?? "",
        upsell_course_ids: (existingCourse as any).upsell_course_ids ?? [],
        cross_sell_course_ids: (existingCourse as any).cross_sell_course_ids ?? [],
        purchase_note: (existingCourse as any).purchase_note ?? "",
        enable_reviews: (existingCourse as any).enable_reviews ?? true,
        status: (existingCourse as any).status ?? "draft",
        instructor_id: existingCourse.instructor_id ?? null,
        tag_ids: [],
      });
    }
  }, [existingCourse]);

  // Load existing course tags
  const { data: existingTags = [] } = useQuery({
    queryKey: ["admin-course-tags", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("course_tags").select("tag_id").eq("course_id", courseId!);
      if (error) throw error;
      return data.map(t => t.tag_id);
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingTags.length > 0) {
      setForm(prev => ({ ...prev, tag_ids: existingTags }));
    }
  }, [existingTags]);

  const { data: instructors = [] } = useQuery({
    queryKey: ["admin-instructors-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("instructors").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ["admin-courses-list-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ["admin-tags-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("course-thumbnails").upload(fileName, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("course-thumbnails").getPublicUrl(fileName);
    setForm(prev => ({ ...prev, thumbnail_url: urlData.publicUrl }));
    setUploading(false);
    toast({ title: "Thumbnail uploaded!" });
  };

  const buildPayload = (statusOverride?: string) => ({
    title: form.title,
    description: form.description,
    category: form.category,
    category_id: form.category_id,
    difficulty: form.difficulty,
    duration_hours: form.duration_hours,
    learning_outcomes: form.learning_outcomes.split("\n").map(s => s.trim()).filter(Boolean),
    thumbnail_url: form.thumbnail_url,
    price: form.price,
    is_published: (statusOverride || form.status) === "published",
    instructor_id: form.instructor_id || null,
    product_type: form.product_type,
    course_type: form.course_type,
    intro_video_url: form.intro_video_url || null,
    discount_price: form.discount_price,
    early_bird_price: form.early_bird_price,
    currency: form.currency,
    discount_start: form.discount_start || null,
    discount_end: form.discount_end || null,
    max_enrollment: form.max_enrollment,
    enrollment_start: form.enrollment_start || null,
    enrollment_end: form.enrollment_end || null,
    purchase_note: form.purchase_note || null,
    enable_reviews: form.enable_reviews,
    status: statusOverride || form.status,
    upsell_course_ids: form.upsell_course_ids,
    cross_sell_course_ids: form.cross_sell_course_ids,
  } as any);

  const saveMutation = useMutation({
    mutationFn: async (statusOverride?: string) => {
      const payload = buildPayload(statusOverride);
      let savedCourseId = courseId;
      if (isEditing) {
        const { error } = await supabase.from("courses").update(payload).eq("id", courseId!);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("courses").insert(payload).select("id").single();
        if (error) throw error;
        savedCourseId = data.id;
      }

      // Sync tags
      if (savedCourseId) {
        await supabase.from("course_tags").delete().eq("course_id", savedCourseId);
        if (form.tag_ids.length > 0) {
          await supabase.from("course_tags").insert(
            form.tag_ids.map(tag_id => ({ course_id: savedCourseId!, tag_id }))
          );
        }
      }

      await logAdminActivity(isEditing ? "update" : "create", "course", savedCourseId ?? undefined, { title: form.title });
    },
    onSuccess: (_, statusOverride) => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: statusOverride === "published" ? "Course Published!" : "Course Saved" });
      navigate("/admin/courses");
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Auto-save draft every 30s
  useEffect(() => {
    if (!form.title) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => {
      if (isEditing && form.title) {
        supabase.from("courses").update(buildPayload()).eq("id", courseId!).then(() => {});
      }
    }, 30000);
    setAutoSaveTimer(timer);
    return () => { if (timer) clearTimeout(timer); };
  }, [form]);

  const canProceed = () => {
    if (step === 0) return form.title.trim().length > 0;
    return true;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/courses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold">{isEditing ? "Edit Course" : "Create New Course"}</h1>
          <p className="text-sm text-muted-foreground">Basics → Curriculum → Additional</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3">
        {STEPS.map((s, i) => (
          <button key={s.label} onClick={() => i <= step && setStep(i)} className="flex items-center gap-2 flex-1 min-w-fit">
            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              i < step ? "bg-green-500 text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-green-500" : "bg-border"}`} />}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-5">

          {step === 0 && (
            <>
              <h2 className="font-heading text-lg font-semibold">Course Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Product Type</label>
                  <select value={form.product_type} onChange={e => setForm({ ...form, product_type: e.target.value })} className={inputClass}>
                    {PRODUCT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Course Type</label>
                  <select value={form.course_type} onChange={e => setForm({ ...form, course_type: e.target.value })} className={inputClass}>
                    {COURSE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Product Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className={inputClass} placeholder="e.g. Cloud Engineering Masterclass" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Product Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className={inputClass} placeholder="Detailed course overview..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => {
                      const selected = categories.find(c => c.name === e.target.value);
                      setForm({ ...form, category: e.target.value, category_id: selected?.id ?? null });
                    }}
                    className={inputClass}
                  >
                    <option value="">Select a category</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className={inputClass}>
                    {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Duration (hours)</label>
                  <input type="number" step="0.5" value={form.duration_hours} onChange={e => setForm({ ...form, duration_hours: Number(e.target.value) })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Instructor</label>
                <select value={form.instructor_id ?? ""} onChange={e => setForm({ ...form, instructor_id: e.target.value || null })} className={inputClass}>
                  <option value="">No instructor assigned</option>
                  {instructors.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
              </div>
              {/* Tags */}
              <div>
                <label className="text-sm font-medium block mb-1">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.tag_ids.map(tid => {
                    const tag = allTags.find(t => t.id === tid);
                    return tag ? (
                      <span key={tid} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {tag.name}
                        <button type="button" onClick={() => setForm(prev => ({ ...prev, tag_ids: prev.tag_ids.filter(id => id !== tid) }))}
                          className="hover:text-destructive"><X className="h-3 w-3" /></button>
                      </span>
                    ) : null;
                  })}
                </div>
                <select
                  value=""
                  onChange={e => {
                    if (e.target.value && !form.tag_ids.includes(e.target.value)) {
                      setForm(prev => ({ ...prev, tag_ids: [...prev.tag_ids, e.target.value] }));
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">Add a tag...</option>
                  {allTags.filter(t => !form.tag_ids.includes(t.id)).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Learning Outcomes (one per line)</label>
                <textarea value={form.learning_outcomes} onChange={e => setForm({ ...form, learning_outcomes: e.target.value })} rows={4} className={inputClass} placeholder="Master cloud architecture&#10;Deploy infrastructure..." />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-heading text-lg font-semibold">Media & Pricing</h2>
              {/* Thumbnail */}
              <div>
                <label className="text-sm font-medium block mb-2">Course Cover Image</label>
                <div className="flex items-center gap-4">
                  {form.thumbnail_url ? (
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={form.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, thumbnail_url: null }))}
                        className="absolute top-1 right-1 bg-background/80 rounded-full w-5 h-5 flex items-center justify-center text-xs hover:text-destructive">×</button>
                    </div>
                  ) : (
                    <div className="w-32 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploading ? "Uploading..." : "Upload Image"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="text-sm font-medium block mb-1">Introductory Video URL</label>
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <input value={form.intro_video_url} onChange={e => setForm({ ...form, intro_video_url: e.target.value })} className={inputClass} placeholder="https://youtube.com/..." />
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t border-border pt-5 mt-5">
                <h3 className="font-heading font-semibold text-sm mb-3">Pricing</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Regular Price</label>
                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Discount Price</label>
                    <input type="number" value={form.discount_price ?? ""} onChange={e => setForm({ ...form, discount_price: e.target.value ? Number(e.target.value) : null })} className={inputClass} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Early Bird Price</label>
                    <input type="number" value={form.early_bird_price ?? ""} onChange={e => setForm({ ...form, early_bird_price: e.target.value ? Number(e.target.value) : null })} className={inputClass} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Currency</label>
                    <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={inputClass}>
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Discount Start Date</label>
                    <input type="datetime-local" value={form.discount_start} onChange={e => setForm({ ...form, discount_start: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Discount End Date</label>
                    <input type="datetime-local" value={form.discount_end} onChange={e => setForm({ ...form, discount_end: e.target.value })} className={inputClass} />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-heading text-lg font-semibold">Inventory & Product Links</h2>
              {/* Inventory */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Max Enrollment</label>
                  <input type="number" value={form.max_enrollment ?? ""} onChange={e => setForm({ ...form, max_enrollment: e.target.value ? Number(e.target.value) : null })} className={inputClass} placeholder="Unlimited" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Enrollment Opens</label>
                  <input type="datetime-local" value={form.enrollment_start} onChange={e => setForm({ ...form, enrollment_start: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Enrollment Closes</label>
                  <input type="datetime-local" value={form.enrollment_end} onChange={e => setForm({ ...form, enrollment_end: e.target.value })} className={inputClass} />
                </div>
              </div>

              {/* Upsells */}
              <div className="border-t border-border pt-5 mt-5 space-y-4">
                <h3 className="font-heading font-semibold text-sm">Product Links</h3>
                <div>
                  <label className="text-sm font-medium block mb-1">Upsell Courses</label>
                  <select multiple value={form.upsell_course_ids} onChange={e => setForm({ ...form, upsell_course_ids: Array.from(e.target.selectedOptions, o => o.value) })}
                    className={`${inputClass} min-h-[100px]`}>
                    {allCourses.filter(c => c.id !== courseId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">Hold Ctrl/Cmd to select multiple</p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Cross-Sell Courses</label>
                  <select multiple value={form.cross_sell_course_ids} onChange={e => setForm({ ...form, cross_sell_course_ids: Array.from(e.target.selectedOptions, o => o.value) })}
                    className={`${inputClass} min-h-[100px]`}>
                    {allCourses.filter(c => c.id !== courseId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-heading text-lg font-semibold">Finalize & Publish</h2>
              <div>
                <label className="text-sm font-medium block mb-1">Purchase Note</label>
                <textarea value={form.purchase_note} onChange={e => setForm({ ...form, purchase_note: e.target.value })} rows={3} className={inputClass}
                  placeholder="Message displayed to students after purchase..." />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.enable_reviews} onChange={e => setForm({ ...form, enable_reviews: e.target.checked })} id="reviews" className="rounded" />
                <label htmlFor="reviews" className="text-sm">Enable Reviews</label>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Course Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass}>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                </select>
              </div>

              {/* Summary */}
              <div className="border-t border-border pt-5 mt-5">
                <h3 className="font-heading font-semibold text-sm mb-3">Course Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{form.title || "—"}</span></div>
                  <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{form.category}</span></div>
                  <div><span className="text-muted-foreground">Price:</span> <span className="font-medium">{form.currency === "NGN" ? formatNaira(form.price) : `$${form.price}`}</span></div>
                  <div><span className="text-muted-foreground">Difficulty:</span> <span className="font-medium">{form.difficulty}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{form.course_type}</span></div>
                  <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium">{form.duration_hours}h</span></div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <div className="flex gap-2">
          {step === 3 ? (
            <>
              <Button variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-1" /> Save Draft
              </Button>
              <Button onClick={() => saveMutation.mutate("published")} disabled={saveMutation.isPending || !form.title}>
                <Send className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "Publishing..." : "Publish Course"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
