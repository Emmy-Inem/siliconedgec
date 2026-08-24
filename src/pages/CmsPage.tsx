import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Loader2, ArrowLeft, FileText, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface CmsPage {
  title: string;
  content: string | null;
  meta_description: string | null;
  status: string;
  updated_at?: string;
}

// Realistic stock hero imagery per page (Unsplash, broad-license).
// Falls back to a generic professional banner if the slug isn't mapped.
const HERO_IMAGES: Record<string, { src: string; alt: string; eyebrow?: string }> = {
  about: {
    src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2000&q=80",
    alt: "Silicon Edge instructors collaborating with students in a modern training studio",
    eyebrow: "Who we are",
  },
  privacy: {
    src: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=2000&q=80",
    alt: "Secured digital interface representing user privacy",
    eyebrow: "Your data, protected",
  },
  terms: {
    src: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=2000&q=80",
    alt: "Legal documents and notebook on a clean desk",
    eyebrow: "The fine print",
  },
  refund: {
    src: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=2000&q=80",
    alt: "Person reviewing finance and refund details on a laptop",
    eyebrow: "Fair, transparent refunds",
  },
};
const DEFAULT_HERO = {
  src: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=2000&q=80",
  alt: "Professional team working together",
  eyebrow: "Silicon Edge Consulting",
};

export default function CmsPagePublic() {
  const { slug } = useParams();
  const hero = (slug && HERO_IMAGES[slug]) || DEFAULT_HERO;
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      setPage(null);
      const { data } = await (supabase.from("cms_pages" as any).select("title, content, meta_description, status, updated_at").eq("slug", slug).eq("status", "published").maybeSingle());
      if (!active) return;
      if (!data) setNotFound(true);
      else setPage(data as unknown as CmsPage);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  const updatedLabel = page?.updated_at
    ? new Date(page.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title={page?.title ?? "Page"} description={page?.meta_description ?? undefined} />
      <Header />
      <main className="flex-1">
        {loading ? (
          <div className="flex justify-center items-center py-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notFound ? (
          <div className="container mx-auto px-4 py-32 text-center max-w-xl">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-3">Page not found</h1>
            <p className="text-muted-foreground mb-8">We couldn't find the page you're looking for. It may have been moved or unpublished.</p>
            <Button asChild>
              <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back to home</Link>
            </Button>
          </div>
        ) : page && (
          <>
            {/* Hero — matches Business / Certificates pattern */}
            <section className="relative overflow-hidden bg-white pt-28 pb-20 border-b border-border/40">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_55%)]" />
              <div
                className="absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage: "radial-gradient(hsl(var(--primary) / 0.16) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                  maskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
                  WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
                }}
              />
              <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full opacity-20 blur-3xl" style={{ background: "hsl(var(--primary))" }} />
              <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "hsl(var(--gold))" }} />
              <div className="container mx-auto px-4 relative">
                <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
                  <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                  <span className="mx-2 opacity-50">/</span>
                  <span className="text-foreground font-medium">{page.title}</span>
                </nav>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-5">
                      {hero.eyebrow ?? "Silicon Edge Consulting"}
                    </p>

                    <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-[1.05] tracking-tight">
                      <span className="text-gradient">{page.title}</span>
                      <span className="text-gold">.</span>
                    </h1>
                    {page.meta_description && (
                      <p className="text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed mb-6">
                        {page.meta_description}
                      </p>
                    )}
                    {updatedLabel && (
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground/80">
                        Last updated · {updatedLabel}
                      </p>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, rotate: 2 }}
                    animate={{ opacity: 1, scale: 1, rotate: 2 }}
                    transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                    className="relative hidden lg:block"
                  >
                    <div className="absolute -inset-6 bg-gradient-to-br from-primary/20 via-transparent to-gold/20 rounded-3xl blur-2xl" />
                    <img
                      src={hero.src}
                      alt={hero.alt}
                      loading="eager"
                      className="relative rounded-2xl border border-primary/20 shadow-2xl shadow-primary/20 w-full max-w-lg ml-auto object-cover aspect-[5/4]"
                    />
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Content */}
            <section className="container mx-auto px-4 py-16 md:py-20">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 max-w-6xl mx-auto">
                <article className="glass-card border border-border rounded-2xl p-6 sm:p-10 md:p-14 shadow-lg">
                  <div className="prose prose-neutral dark:prose-invert max-w-none
                                  prose-headings:font-heading
                                  prose-h1:text-3xl prose-h1:md:text-4xl prose-h1:font-bold prose-h1:mb-6 prose-h1:mt-0
                                  prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border
                                  prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3
                                  prose-p:leading-relaxed prose-p:text-base
                                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                                  prose-strong:text-foreground
                                  prose-li:my-1
                                  prose-ul:my-4 prose-ol:my-4
                                  prose-hr:border-border">
                    <ReactMarkdown>{page.content ?? ""}</ReactMarkdown>
                  </div>
                </article>

                {/* Sidebar */}
                <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
                  <div className="glass-card border border-border rounded-2xl p-6">
                    <h3 className="font-heading font-semibold text-sm uppercase tracking-widest text-muted-foreground mb-4">
                      Need to talk to us?
                    </h3>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>3rd floor, 86–90 Paul Street, London, EC2A 4NE</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                        <a href="mailto:info@siliconedgec.com" className="hover:text-primary transition-colors break-all">info@siliconedgec.com</a>
                      </li>
                      <li className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                        <a href="tel:+447741247592" className="hover:text-primary transition-colors">+44 7741 247592</a>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl p-6 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/20">
                    <h3 className="font-heading font-semibold text-base mb-2">Ready to upskill?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Browse live, instructor-led tech programs built for completion and real career outcomes.
                    </p>
                    <Button asChild size="sm" className="w-full">
                      <Link to="/courses">Explore Courses</Link>
                    </Button>
                  </div>

                  <div className="text-center">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to home
                    </Link>
                  </div>
                </aside>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
