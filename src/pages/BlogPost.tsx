import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
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
}

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  const jsonLd = post && {
    "@context": "https://schema.org",
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
    mainEntityOfPage: `https://siliconedgec.com/blog/${post.slug}`,
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={post?.title ?? "Blog Post"}
        description={post?.excerpt ?? undefined}
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
              <span className="text-[10px] tracking-widest uppercase text-primary font-semibold">{post.category}</span>
            )}
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mt-3 mb-5 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" />{post.author_name || "Silicon Edge"}</span>
              {post.published_at && (
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{new Date(post.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
              )}
            </div>
            {post.featured_image_url && (
              <img src={post.featured_image_url} alt={post.title} className="w-full rounded-2xl mb-10 border border-border" />
            )}
            <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-heading prose-a:text-primary">
              <ReactMarkdown>{post.content ?? ""}</ReactMarkdown>
            </div>

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