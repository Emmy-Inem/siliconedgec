import { useState, useMemo, forwardRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CourseCard } from "@/components/CourseCard";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useCourses } from "@/hooks/useCourses";
import { Search, Loader2, SlidersHorizontal, X, Cloud, Cpu, Code2, Shield, Rocket, GraduationCap, Users, ArrowRight, PlayCircle, Terminal, Clock, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SEO } from "@/components/SEO";
import { siteUrl } from "@/lib/site-url";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { shouldShowStagedFeature } from "@/lib/localhost-preview";
import { formatNaira } from "@/lib/format-currency";
import instructor1 from "@/assets/stock/instructor-1.jpg";
import instructor2 from "@/assets/stock/instructor-2.jpg";
import instructor3 from "@/assets/stock/instructor-3.jpg";
import instructor4 from "@/assets/stock/instructor-4.jpg";

const LEARNER_AVATARS = [instructor1, instructor2, instructor3, instructor4];

const difficulties = ["All Levels", "Beginner", "Intermediate", "Expert"];

const COURSE_FAQS = [
  { q: "What courses does Silicon Edge Consulting offer?", a: "Live, instructor-led courses in Cloud Engineering, DevOps, AI, Data Engineering, Cybersecurity and Software Engineering." },
  { q: "Who are the courses designed for?", a: "Career changers, early-career engineers, and working professionals upskilling into cloud, data and AI roles." },
  { q: "Are the courses instructor-led?", a: "Yes. Every cohort runs live with an instructor, and sessions are recorded for later review." },
  { q: "Do courses include practical projects?", a: "Yes. Each course includes hands-on labs and portfolio projects graded by your instructor." },
];

/* ----------------------------- premium hero ----------------------------- */

const HERO_TRACKS = [
  { icon: Cloud,        label: "Cloud Engineering",  tint: "from-sky-500/20 to-blue-500/10" },
  { icon: Cpu,          label: "AI & Machine Learning", tint: "from-violet-500/20 to-fuchsia-500/10" },
  { icon: Code2,        label: "Web Development",    tint: "from-emerald-500/20 to-teal-500/10" },
  { icon: Shield,       label: "Cybersecurity",      tint: "from-rose-500/20 to-orange-500/10" },
  { icon: Rocket,       label: "DevOps",             tint: "from-amber-500/20 to-yellow-500/10" },
  { icon: GraduationCap,label: "Data Science",       tint: "from-indigo-500/20 to-purple-500/10" },
];

const AZURE_BOOTCAMP_ID = "3b1f29ec-8fd4-4ff0-9357-1987b90e6c91";

const CoursesHero = forwardRef<HTMLElement, { coursesCount: number }>(function CoursesHero({ coursesCount }, ref) {
  // Query promoted banner config from site_content
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

  const isStaged = config?.showOnLocalhostOnly ?? true;
  const showHighlightedCard = shouldShowStagedFeature(isStaged);

  const targetCourseId = (config?.courseIds && config.courseIds.length > 0)
    ? config.courseIds[0]
    : AZURE_BOOTCAMP_ID;

  // Query target course details
  const { data: promotedCourse } = useQuery({
    queryKey: ["courses-hero-promoted-course", targetCourseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, slug, description, category, difficulty, price, discount_price, duration_hours, thumbnail_url")
        .eq("id", targetCourseId)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },
    staleTime: 60 * 1000,
  });

  const rawTitle = promotedCourse?.title || "One-Month Cloud Engineering Bootcamp - Microsoft Azure";
  const courseTitle = rawTitle.replace(/—/g, "-");
  const courseDescription = (
    promotedCourse?.description
      ? promotedCourse.description.split(".")[0] + ". " + (promotedCourse.description.split(".")[1] ? promotedCourse.description.split(".")[1] + "." : "")
      : "Practical 4-week accelerator with live Azure labs, real architectures, and AZ-900/AZ-104 career preparation."
  ).replace(/—/g, "-").trim();
  const courseThumbnail = promotedCourse?.thumbnail_url || "https://sdddxnjlgjjaoayyraxn.supabase.co/storage/v1/object/public/course-thumbnails/cloud-engineering-accelerator.png";
  const courseSlug = promotedCourse?.slug || "cloud-engineering-accelerator-4-week-hands-on-bootcamp";
  const courseUrl = `/courses/${courseSlug}`;
  const coursePrice = promotedCourse?.discount_price ?? promotedCourse?.price ?? 500000;
  const courseHours = promotedCourse?.duration_hours ?? 32;
  const badgeLabel = (config?.badgeText || "Featured Bootcamp").replace(/—/g, "-");

  return (
    <section ref={ref} className="relative overflow-hidden bg-white pt-28 pb-20 md:pt-36 md:pb-28 border-b border-border/40">
      {/* Subtle, premium backdrop - soft top-left primary wash + tiny dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.06),transparent_60%)]" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--primary) / 0.5) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
        }}
      />

      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left - copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: "easeOut" }}
            className="lg:col-span-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-5">
              Live, instructor-led tracks
            </p>

            <h1 className="font-heading text-4xl sm:text-5xl md:text-[3.5rem] lg:text-[4rem] font-bold text-foreground mb-5 leading-[1.05] tracking-tight">
              Find the course that{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="text-gradient">moves your career</span>
                <span className="text-gold">.</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.35, duration: 0.55, ease: "easeOut" }}
                  aria-hidden
                  className="absolute -bottom-1 left-0 right-2 h-[5px] origin-left rounded-full bg-gradient-to-r from-primary/40 via-accent/40 to-gold/40"
                />
              </span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed">
              Cloud, AI, DevOps, Cybersecurity and Web programmes, taught live by working engineers
              and built around the skills employers hire for.
            </p>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8 pt-7 border-t border-border/50">
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{coursesCount}</span> programme{coursesCount === 1 ? "" : "s"} available
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                Live sessions with recordings
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                Verified certificate on completion
              </div>
            </div>

          </motion.div>

          {/* Right - Highlighted Course Card or Generic Tracks */}
          <div className="lg:col-span-6 relative mt-8 lg:mt-0">
            {showHighlightedCard ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="group relative rounded-2xl md:rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl text-left flex flex-col justify-between min-h-[440px]"
              >
                {/* Background course thumbnail image with subtle zoom */}
                <img
                  src={courseThumbnail}
                  alt={courseTitle}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none"
                />

                {/* Layered dark scrim & subtle blur for crystal-clear readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/50 pointer-events-none" />
                <div className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1.5px] pointer-events-none" />

                {/* Foreground content with razor-sharp contrast */}
                <div className="relative z-10 p-6 md:p-8 flex flex-col justify-between h-full space-y-6">
                  {/* Top meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-slate-900/90 text-slate-100 border border-slate-700 shadow-sm backdrop-blur-sm">
                        {badgeLabel}
                      </span>
                      <span className="text-xs text-slate-300 font-medium">
                        Enrolling Now
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-sky-400">
                      100% Practical
                    </span>
                  </div>

                  {/* Title & Concise Description ("a bit text") for optimal visual balance */}
                  <div className="space-y-2.5">
                    <h2 className="font-heading text-xl sm:text-2xl font-bold text-white leading-snug tracking-tight drop-shadow-sm">
                      {courseTitle}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-lg font-normal drop-shadow-sm">
                      {courseDescription}
                    </p>
                  </div>

                  {/* Core Pillars: Sleek glass chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg border border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center gap-2 text-slate-200 shadow-sm">
                      <Terminal className="h-4 w-4 text-sky-400 shrink-0" />
                      <span className="font-medium text-[11px]">Live Azure Labs</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center gap-2 text-slate-200 shadow-sm">
                      <Clock className="h-4 w-4 text-sky-400 shrink-0" />
                      <span className="font-medium text-[11px]">4 Weeks ({courseHours} Hrs)</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center gap-2 text-slate-200 shadow-sm">
                      <ShieldCheck className="h-4 w-4 text-sky-400 shrink-0" />
                      <span className="font-medium text-[11px]">AZ-900 / AZ-104</span>
                    </div>
                  </div>

                  {/* Pricing & CTA */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                    <div>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">Tuition</span>
                      <span className="text-2xl font-bold font-heading text-white drop-shadow-sm">{formatNaira(Number(coursePrice))}</span>
                    </div>

                    <Button size="lg" asChild className="gap-2 font-medium hover-scale shadow-lg">
                      <Link to={courseUrl}>
                        <span>View Bootcamp Details</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {HERO_TRACKS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.label}
                      className="group relative rounded-xl border border-border/70 bg-card/60 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-sm"
                    >
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${t.tint} flex items-center justify-center mb-3 text-primary`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-foreground leading-snug">{t.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

export default function Courses() {
  const { data: courses = [], isLoading } = useCourses();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") ?? "All");
  const [activeDifficulty, setActiveDifficulty] = useState("All Levels");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiMaxPrice, setAiMaxPrice] = useState<number | null>(null);

  // Allow deep-links like /courses?q=aws or /courses?category=AWS
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setSearch(q);
    const cat = searchParams.get("category");
    if (cat !== null) {
      setActiveCategory(cat);
    }
  }, [searchParams]);

  const handleSelectCategory = (cat: string) => {
    setActiveCategory(cat);
    const newParams = new URLSearchParams(searchParams);
    if (cat === "All") {
      newParams.delete("category");
    } else {
      newParams.set("category", cat);
    }
    setSearchParams(newParams, { replace: true });
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(courses.map((c) => c.category)));
    return ["All", ...cats.sort()];
  }, [courses]);

  const filtered = courses.filter((c) => {
    const matchCategory = activeCategory === "All" || c.category === activeCategory;
    const matchDifficulty = activeDifficulty === "All Levels" || c.difficulty === activeDifficulty;
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchPrice = aiMaxPrice == null || (c.price ?? 0) <= aiMaxPrice;
    return matchCategory && matchDifficulty && matchSearch && matchPrice;
  });

  // Group courses by track (AWS, Azure, GCP, DevOps, Data, Cyber, Programming,
  // AI/ML) so that every level of the same track sits side-by-side instead of
  // all Beginners → Intermediates → Experts. Within a track we order by
  // difficulty Beginner → Intermediate → Expert. Webinars float to the top.
  const TRACK_RULES: Array<{ key: string; test: RegExp }> = [
    { key: "AWS", test: /\baws\b/i },
    { key: "Azure", test: /\bazure\b|\baz-?\d/i },
    { key: "Google Cloud", test: /google cloud|gcp/i },
    { key: "Cloud Engineering", test: /cloud engineering|cloud accelerator/i },
    { key: "DevOps", test: /devops|kubernetes|docker|terraform|ansible|ci\/cd/i },
    { key: "Data Engineering", test: /data engineering|spark|kafka|etl|warehous|lakehouse/i },
    { key: "Cybersecurity", test: /cyber|security|red team|siem|ethical hack/i },
    { key: "AI & ML", test: /\bai\b|machine learning|deep learning|mlops|nlp|computer vision|tensorflow|scikit/i },
    { key: "Programming", test: /programming|software|algorithm|backend|web development|python|java/i },
  ];
  const DIFFICULTY_RANK: Record<string, number> = { Beginner: 0, Intermediate: 1, Expert: 2 };
  const trackOf = (title: string, category: string): string => {
    for (const r of TRACK_RULES) if (r.test.test(title)) return r.key;
    return category || "Other";
  };
  const isWebinar = (c: typeof courses[number]) =>
    (c.price ?? 0) === 0 || (c.title ?? "").toUpperCase().startsWith("FREE");
  const PINNED_SLUGS = new Set<string>([
    "cloud-engineering-accelerator-4-week-hands-on-bootcamp",
  ]);
  const sorted = [...filtered].sort((a, b) => {
    const ap = a.slug && PINNED_SLUGS.has(a.slug) ? 0 : 1;
    const bp = b.slug && PINNED_SLUGS.has(b.slug) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const aw = isWebinar(a) ? 0 : 1;
    const bw = isWebinar(b) ? 0 : 1;
    if (aw !== bw) return aw - bw;
    const ta = trackOf(a.title, a.category);
    const tb = trackOf(b.title, b.category);
    if (ta !== tb) return ta.localeCompare(tb);
    const da = DIFFICULTY_RANK[a.difficulty] ?? 99;
    const db = DIFFICULTY_RANK[b.difficulty] ?? 99;
    if (da !== db) return da - db;
    return (a.price ?? 0) - (b.price ?? 0);
  });

  const activeFilterCount =
    (activeCategory !== "All" ? 1 : 0) + (activeDifficulty !== "All Levels" ? 1 : 0);

  const clearFilters = () => {
    setActiveCategory("All");
    setActiveDifficulty("All Levels");
    setSearch("");
    setAiMaxPrice(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("category");
    setSearchParams(newParams, { replace: true });
  };

  const runAiSearch = async () => {
    const q = search.trim();
    if (!q) return;
    setAiSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-course-search", {
        body: { query: q, categories: categories.filter((c) => c !== "All"), difficulties: difficulties.filter((d) => d !== "All Levels") },
      });
      if (error) throw error;
      if (data?.category && categories.includes(data.category)) setActiveCategory(data.category);
      if (data?.difficulty && difficulties.includes(data.difficulty)) setActiveDifficulty(data.difficulty);
      setAiMaxPrice(typeof data?.maxPriceNgn === "number" ? data.maxPriceNgn : null);
      const kw = Array.isArray(data?.keywords) && data.keywords.length ? data.keywords.join(" ") : q;
      setSearch(kw);
      toast({ title: "AI search applied", description: `Filtered by ${[data?.category, data?.difficulty, data?.maxPriceNgn ? `≤ ₦${data.maxPriceNgn.toLocaleString()}` : null].filter(Boolean).join(" · ") || "keywords"}` });
    } catch (e: any) {
      toast({ title: "AI search failed", description: e.message ?? "Try again", variant: "destructive" });
    } finally {
      setAiSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={activeCategory !== "All" ? `${activeCategory} Courses & Bootcamps | Silicon Edge Consulting` : "Tech Courses & Bootcamps | Silicon Edge Consulting"}
        description={activeCategory !== "All" ? `Explore live, mentor-led ${activeCategory} courses and bootcamps with practical real-world labs and career coaching.` : "Explore live, instructor-led courses in Cloud Engineering, AWS, Azure, DevOps, Kubernetes, and Data."}
        canonical={siteUrl(activeCategory !== "All" ? `/courses?category=${encodeURIComponent(activeCategory)}` : "/courses")}
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "ItemList",
              itemListElement: filtered.slice(0, 10).map((c, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: c.title,
                url: siteUrl(`/courses/${c.slug ?? c.id}`),
              })),
            },
            {
              "@type": "FAQPage",
              mainEntity: COURSE_FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }}
      />
      <Header />

      <CoursesHero coursesCount={courses.length} />

      <section className="py-8 md:py-10">
        <div className="container mx-auto px-4">
          {/* Search + Filter Toggle */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="default"
              className="flex-shrink-0 hidden sm:inline-flex"
              onClick={runAiSearch}
              disabled={aiSearching || !search.trim()}
              title="Smart search - e.g. 'beginner AWS under 50k'"
            >
              {aiSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1 hidden md:inline">Ask AI</span>
            </Button>
            <Button
              variant="outline"
              size="default"
              className="md:hidden relative flex-shrink-0"
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-label={`Toggle filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Desktop Filters - always visible */}
          <div className="hidden md:block space-y-4 mb-8">
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleSelectCategory(cat)}
                  className={`relative px-1 py-3 text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                  {activeCategory === cat && (
                    <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDifficulty(d)}
                  className={`relative px-1 py-1.5 text-xs font-medium transition-colors ${
                    activeDifficulty === d
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
                  {activeDifficulty === d && (
                    <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-primary rounded-full" />
                  )}
                </button>
              ))}
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline ml-2">
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Mobile Filters - slide-down panel */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="md:hidden overflow-hidden mb-6"
              >
                <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Category</p>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleSelectCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            activeCategory === cat
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Level</p>
                    <div className="flex flex-wrap gap-1.5">
                      {difficulties.map((d) => (
                        <button
                          key={d}
                          onClick={() => setActiveDifficulty(d)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            activeDifficulty === d
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {activeFilterCount > 0 && (
                      <Button size="sm" variant="ghost" onClick={clearFilters} className="text-xs">
                        Clear all
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setFiltersOpen(false)} className="text-xs ml-auto">
                      Show {filtered.length} results
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {filtered.length} program{filtered.length !== 1 ? "s" : ""} found
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {sorted.map((course, i) => (
                  <CourseCard key={course.id} course={course} index={i} />
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  <p className="text-lg">No courses match your filters.</p>
                  <p className="text-sm mt-2">Try adjusting your search or category selection.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Common questions ── */}
      <section className="pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-6">Common questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {COURSE_FAQS.map((f, i) => (
              <AccordionItem key={i} value={`course-faq-${i}`} className="border-border/60">
                <AccordionTrigger className="text-left font-medium hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="text-sm text-muted-foreground mt-6">
            Prefer a guided sequence? Browse our{" "}
            <Link to="/paths" className="text-primary hover:underline">career learning paths</Link>{" "}
            or see{" "}
            <Link to="/for-businesses" className="text-primary hover:underline">corporate team training</Link>.
          </p>
        </div>
      </section>

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
