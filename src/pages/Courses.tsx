import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CourseCard } from "@/components/CourseCard";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useCourses } from "@/hooks/useCourses";
import { Search, Loader2, SlidersHorizontal, X, Sparkles, Cloud, Cpu, Code2, Shield, Rocket, GraduationCap, Users, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

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

function CoursesHero({ coursesCount }: { coursesCount: number }) {
  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-16 md:pb-20 border-b border-border/40">
      {/* Layered backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_55%)]" />
      <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full opacity-20 blur-3xl" style={{ background: "hsl(var(--primary))" }} />
      <div className="absolute -bottom-32 -right-24 w-[24rem] h-[24rem] rounded-full opacity-15 blur-3xl" style={{ background: "hsl(var(--gold))" }} />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--primary) / 0.14) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
        }}
      />

      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="lg:col-span-7"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-5">
              <Sparkles className="h-3 w-3" /> Live, instructor-led tracks
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl font-bold text-foreground mb-4 leading-[1.04] tracking-tight">
              Find the course that{" "}
              <span className="relative inline-block">
                <span className="text-gradient">moves your career</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
                  className="absolute -bottom-1 left-0 right-0 h-[6px] origin-left rounded-full bg-gradient-to-r from-primary/30 via-accent/30 to-gold/30"
                />
              </span>
              <span className="text-gold">.</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed">
              Cloud, AI, DevOps, Cybersecurity, Web — taught live by engineers actively shipping in tech.
              No filler, no fluff — only the skills employers actually pay for.
            </p>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-7">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {[...Array(4)].map((_, i) => (
                    <span key={i} className="w-6 h-6 rounded-full ring-2 ring-white" style={{
                      background: ["#fbbf24", "#a78bfa", "#34d399", "#60a5fa"][i],
                    }} />
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
          <div className="lg:col-span-5 relative hidden md:block">
            <div className="absolute -inset-6 bg-gradient-to-br from-primary/15 via-transparent to-gold/15 rounded-[2.5rem] blur-2xl" />
            <div className="relative grid grid-cols-2 gap-3">
              {HERO_TRACKS.map((t, i) => (
                <motion.div
                  key={t.label}
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.45, ease: "easeOut" }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${t.tint} backdrop-blur-sm p-4 ${
                    i % 3 === 0 ? "translate-y-2" : i % 3 === 1 ? "-translate-y-1" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-border/60 flex items-center justify-center mb-2.5">
                    <t.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <p className="font-heading font-semibold text-sm text-foreground leading-tight">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Live cohort</p>
                  <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-white/40 blur-xl group-hover:bg-white/60 transition-colors" />
                </motion.div>
              ))}
            </div>

            {/* Floating "Live now" badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, type: "spring", stiffness: 120, damping: 14 }}
              className="absolute -top-3 -left-3 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-border shadow-xl"
            >
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold">Cohort starts soon</span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

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
            url: `${typeof window !== "undefined" ? window.location.origin : ""}/courses/${c.id}`,
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
