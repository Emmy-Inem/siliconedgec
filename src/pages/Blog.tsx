import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { siteUrl } from "@/lib/site-url";
import { Loader2, ArrowRight } from "lucide-react";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  category: string | null;
  published_at: string | null;
}

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await (supabase
        .from("blog_posts" as any)
        .select("id,title,slug,excerpt,featured_image_url,author_name,category,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false }));
      if (!active) return;
      setPosts((data as unknown as Post[]) ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const categories = Array.from(new Set(posts.map((p) => p.category).filter(Boolean))) as string[];
  const filteredPosts = activeCategory
    ? posts.filter((p) => p.category?.toLowerCase() === activeCategory.toLowerCase())
    : posts;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Silicon Edge Blog",
    url: siteUrl("/blog"),
    blogPost: posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: siteUrl(`/blog/${p.slug}`),
      datePublished: p.published_at,
      author: p.author_name ? { "@type": "Person", name: p.author_name } : undefined,
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={activeCategory ? `${activeCategory} Articles — Blog` : "Blog — Tech Career Insights & Tutorials"}
        description="Articles on AI, cloud, DevOps, careers and live training from Silicon Edge Consulting."
        canonical={siteUrl(activeCategory ? `/blog?category=${encodeURIComponent(activeCategory)}` : "/blog")}
        jsonLd={jsonLd}
      />
      <Header />
      <main className="flex-1 container mx-auto px-5 sm:px-6 pt-28 sm:pt-32 pb-20 max-w-6xl">
        <header className="mb-10 sm:mb-14 text-center">
          <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-3">Insights</p>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            The Silicon Edge Blog
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-6">
            Practical guides, career stories, and updates from our instructors on AI, cloud, DevOps, and more.
          </p>
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !activeCategory
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSearchParams({ category: cat })}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory?.toLowerCase() === cat.toLowerCase()
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No articles found in this category.</p>
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="text-primary hover:underline text-sm font-medium"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((p) => (
              <Link
                key={p.id}
                to={`/blog/${p.slug}`}
                className="group rounded-2xl border border-border/60 overflow-hidden bg-card hover:border-primary/40 hover:shadow-lg transition-all"
              >
                {p.featured_image_url ? (
                  <img src={p.featured_image_url} alt={p.title} loading="lazy" className="w-full aspect-[16/9] object-cover" />
                ) : (
                  <div className="w-full aspect-[16/9] bg-gradient-to-br from-primary/20 to-accent/10" />
                )}
                <div className="p-5">
                  {p.category && (
                    <span className="text-[10px] tracking-widest uppercase text-primary font-semibold">{p.category}</span>
                  )}
                  <h2 className="font-heading text-lg font-semibold mt-2 mb-2 group-hover:text-primary transition-colors line-clamp-2">{p.title}</h2>
                  {p.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
                    <span>{p.author_name || "Silicon Edge"}</span>
                    {p.published_at && <span>{new Date(p.published_at).toLocaleDateString()}</span>}
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm text-primary mt-3 font-medium">
                    Read article <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}