import { useState, useMemo, forwardRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CourseCard } from "@/components/CourseCard";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useCourses } from "@/hooks/useCourses";
import { Search, Loader2, SlidersHorizontal, X, Sparkles, Cloud, Cpu, Code2, Shield, Rocket, GraduationCap, Users, Star, ArrowRight, PlayCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { siteUrl } from "@/lib/site-url";

const difficulties = ["All Levels", "Beginner", "Intermediate", "Expert"];

/* ----------------------------- premium hero ----------------------------- */

const HERO_TRACKS = [
  { icon: Cloud,        label: "Cloud Engineering",  tint: "from-sky-500/20 to-blue-500/10" },
  { icon: Cpu,          label: "AI & Machine Learning", tint: "from-violet-500/20 to-fuchsia-500/10" },
  { icon: Code2,        label: "Web Development",    tint: "from-emerald-500/20 to-teal-500/10" },
  { icon: Shield,       label: "Cybersecurity",      tint: "from-rose-500/20 to-orange-500/10" },
  { icon: Rocket,       label: "DevOps",             tint: "from-amber-500/20 to-yellow-500/10" },
  { icon: GraduationCap,label: "Data Science",       tint: "from-indigo-500/20 to-purple-500/10" },
];

const CoursesHero = forwardRef<HTMLElement, { coursesCount: number }>(function CoursesHero({ coursesCount }, ref) {
  return (
    <section ref={ref} className="relative overflow-hidden bg-white pt-28 pb-20 md:pt-36 md:pb-28 border-b border-border/40">
      {/* Subtle, premium backdrop — soft top-left primary wash + tiny dot grid */}
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
          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: "easeOut" }}
            className="lg:col-span-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.04] border border-foreground/15 text-foreground text-xs font-semibold mb-5">
              <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} /> Live, instructor-led tracks
            </div>
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
              Cloud, AI, DevOps, Cybersecurity, Web — taught live by engineers actively shipping in tech.
              No filler, no fluff — only the skills employers actually pay for.
            </p>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8 pt-7 border-t border-border/50">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {[...Array(4)].map((_, i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded-full ring-2 ring-white"
                    style={{ background: ["hsl(var(--gold))", "hsl(var(--accent))", "hsl(var(--primary))", "hsl(var(--secondary-foreground))"][i] }}
                  />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground"><span className="font-bold text-foreground">2,000+</span> learners</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
                ))}
                <span className="text-xs text-muted-foreground ml-1"><span className="font-bold text-foreground">4.9</span> avg rating</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span><span className="font-bold text-foreground">{Math.max(coursesCount, 1)}</span> live program{coursesCount === 1 ? "" : "s"} now</span>
              </div>
            </div>
          </motion.div>

          {/* Right — floating track tiles */}
          <div className="lg:col-span-6 relative hidden md:block">
            <div aria-hidden className="absolute -inset-6 bg-gradient-to-br from-primary/8 via-transparent to-gold/8 rounded-[2.75rem] blur-2xl" />

            {/* Frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="relative rounded-[2rem] border border-border/70 bg-gradient-to-br from-white to-muted/40 p-5 shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.35)]"
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live tracks
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {HERO_TRACKS.map((t, i) => (
                  <motion.div
                    key={t.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 + i * 0.06, duration: 0.4, ease: "easeOut" }}
                    whileHover={{ y: -3 }}
                    className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${t.tint} p-4`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-border/60 flex items-center justify-center mb-2.5">
                      <t.icon className="h-5 w-5 text-primary" strokeWidth={2.25} />
                    </div>
                    <p className="font-heading font-semibold text-sm text-foreground leading-tight">{t.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Live cohort · Mentor-led</p>
                    <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-white/40 blur-xl group-hover:bg-white/70 transition-colors" />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Floating "Live now" badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55, duration: 0.4, ease: "easeOut" }}
              className="absolute -top-4 -left-4 z-10 flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-border shadow-xl"
            >
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold">Cohort starts soon</span>
            </motion.div>

            {/* Floating completion stat */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4, ease: "easeOut" }}
              className="absolute -bottom-5 -right-3 z-10 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-border shadow-xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-heading text-base font-bold leading-none">92%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Cohort completion</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default function Courses() {
  const { data: courses = [], isLoading } = useCourses();
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeDifficulty, setActiveDifficulty] = useState("All Levels");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    return matchCategory && matchDifficulty && matchSearch;
  });

  const activeFilterCount =
    (activeCategory !== "All" ? 1 : 0) + (activeDifficulty !== "All Levels" ? 1 : 0);

  const clearFilters = () => {
    setActiveCategory("All");
    setActiveDifficulty("All Levels");
    setSearch("");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="All Courses — Live Instructor-Led Tech Training"
        description="Browse live, expert-led courses in Cloud, AI, DevOps, Cybersecurity, Web Development and more. Filter by category and difficulty to find the right path."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: filtered.slice(0, 10).map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.title,
            url: siteUrl(`/courses/${c.id}`),
          })),
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="default"
              className="md:hidden relative flex-shrink-0"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Desktop Filters — always visible */}
          <div className="hidden md:block space-y-4 mb-8">
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
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

          {/* Mobile Filters — slide-down panel */}
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
                          onClick={() => setActiveCategory(cat)}
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
                {filtered.map((course, i) => (
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

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
