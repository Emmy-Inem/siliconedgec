import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CourseCard } from "@/components/CourseCard";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useCourses } from "@/hooks/useCourses";
import { Search, Loader2, SlidersHorizontal, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

const difficulties = ["All Levels", "Beginner", "Intermediate", "Expert"];

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

      <section className="relative overflow-hidden bg-white pt-28 pb-16 md:pb-20 border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_55%)]" />
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
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-5">
              <Sparkles className="h-3 w-3" /> Live, instructor-led tracks
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl font-bold text-foreground mb-4 leading-[1.05] tracking-tight">
              Find the course that <span className="text-gradient">moves your career</span><span className="text-gold">.</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed">
              Cloud, AI, DevOps, Cybersecurity, Web — taught live by engineers actively shipping in tech.
            </p>
          </motion.div>
        </div>
      </section>

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
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDifficulty(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeDifficulty === d
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
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
