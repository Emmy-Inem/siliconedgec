import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { siteUrl } from "@/lib/site-url";
import { Loader2, ArrowLeft, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  category: string | null;
  published_at: string | null;
  updated_at?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  seo_keywords?: string[] | null;
  related_post_ids?: string[] | null;
  reading_time_minutes?: number | null;
  tags?: string[] | null;
}

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState<Post[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase
        .from("blog_posts" as any)
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle());
      if (!active) return;
      if (!data) setNotFound(true);
      else setPost(data as unknown as Post);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    let active = true;
    (async () => {
      let q = supabase.from("blog_posts" as any).select("id,title,slug,excerpt,featured_image_url,category,published_at").eq("status", "published").neq("id", post.id).limit(3);
      if (post.related_post_ids?.length) {
        q = supabase.from("blog_posts" as any).select("id,title,slug,excerpt,featured_image_url,category,published_at").eq("status", "published").in("id", post.related_post_ids).limit(3);
      } else if (post.category) {
        q = q.eq("category", post.category);
      }
      const { data } = await q;
      if (active) setRelated((data as unknown as Post[]) ?? []);
    })();
    return () => { active = false; };
  }, [post]);

  const jsonLd = post && {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt ?? undefined,
        image: post.featured_image_url ?? undefined,
        datePublished: post.published_at,
        dateModified: post.updated_at ?? post.published_at,
        author: { "@type": "Person", name: post.author_name || "Silicon Edge Consulting" },
        publisher: {
          "@type": "Organization",
          name: "Silicon Edge Consulting",
          logo: { "@type": "ImageObject", url: "https://siliconedgec.com/favicon.ico" },
        },
        mainEntityOfPage: siteUrl(`/blog/${post.slug}`),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl("/") },
          { "@type": "ListItem", "position": 2, "name": "Blog", "item": siteUrl("/blog") },
          { "@type": "ListItem", "position": 3, "name": post.title, "item": siteUrl(`/blog/${post.slug}`) },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={post?.meta_title ?? post?.title ?? "Blog Post"}
        description={post?.meta_description ?? post?.excerpt ?? undefined}
        image={post?.featured_image_url ?? undefined}
        type="article"
        jsonLd={jsonLd ?? undefined}
      />
      <Header />
      <main className="flex-1">
        {loading ? (
          <div className="flex justify-center py-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : notFound || !post ? (
          <div className="container mx-auto px-4 py-32 text-center max-w-xl">
            <h1 className="font-heading text-3xl font-bold mb-3">Post not found</h1>
            <p className="text-muted-foreground mb-6">This article may have been removed or unpublished.</p>
            <Button asChild><Link to="/blog"><ArrowLeft className="h-4 w-4 mr-2" /> Back to blog</Link></Button>
          </div>
        ) : (
          <article className="container mx-auto px-5 sm:px-6 pt-28 sm:pt-32 pb-20 max-w-3xl">
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary">Home</Link>
              <span className="mx-2 opacity-50">/</span>
              <Link to="/blog" className="hover:text-primary">Blog</Link>
            </nav>
            {post.category && (
              <Link
                to={`/blog?category=${encodeURIComponent(post.category)}`}
                className="text-[10px] tracking-widest uppercase text-primary font-semibold hover:underline inline-block"
              >
                {post.category}
              </Link>
            )}
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mt-3 mb-5 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" />{post.author_name || "Silicon Edge"}</span>
              {post.published_at && (
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{new Date(post.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
              )}
              {post.reading_time_minutes ? (
                <span className="inline-flex items-center gap-1.5">{post.reading_time_minutes} min read</span>
              ) : null}
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-heading prose-a:text-primary prose-table:w-full prose-th:bg-muted prose-th:text-left prose-th:p-2 prose-td:p-2 prose-td:border prose-th:border prose-table:border-collapse">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content ?? ""}</ReactMarkdown>
            </div>

            {/* Contextual Course CTA for SEO cross-linking and student discovery */}
            <div className="mt-12 p-6 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-semibold text-lg text-foreground">Ready to master these skills?</h3>
                <p className="text-sm text-muted-foreground mt-1">Explore live, instructor-led courses with hands-on projects, certification, and career mentorship.</p>
              </div>
              <Button asChild className="shrink-0">
                <Link to="/courses">Explore Courses</Link>
              </Button>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">#{t}</span>
                ))}
              </div>
            )}

            {related.length > 0 && (
              <section className="mt-16 pt-10 border-t border-border">
                <h2 className="font-heading text-2xl font-bold mb-6">Related articles</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {related.map((r) => (
                    <Link key={r.id} to={`/blog/${r.slug}`} className="group rounded-xl border border-border overflow-hidden hover:border-primary transition-colors bg-card">
                      {r.featured_image_url && (
                        <img src={r.featured_image_url} alt={r.title} loading="lazy" className="w-full aspect-video object-cover" />
                      )}
                      <div className="p-4">
                        {r.category && <span className="text-[10px] tracking-widest uppercase text-primary font-semibold">{r.category}</span>}
                        <h3 className="font-heading text-base font-semibold mt-1 group-hover:text-primary line-clamp-2">{r.title}</h3>
                        {r.excerpt && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{r.excerpt}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-14 pt-8 border-t border-border text-center">
              <Button asChild variant="outline"><Link to="/blog"><ArrowLeft className="h-4 w-4 mr-2" /> More articles</Link></Button>
            </div>
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}