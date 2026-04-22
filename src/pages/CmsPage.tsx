import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Loader2, ArrowLeft } from "lucide-react";

interface CmsPage {
  title: string;
  content: string | null;
  meta_description: string | null;
  status: string;
}

export default function CmsPagePublic() {
  const { slug } = useParams();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await (supabase.from("cms_pages" as any).select("title, content, meta_description, status").eq("slug", slug).eq("status", "published").maybeSingle());
      if (!active) return;
      if (!data) setNotFound(true);
      else setPage(data as unknown as CmsPage);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  return (
    <>
      <SEO title={page?.title ?? "Page"} description={page?.meta_description ?? undefined} />
      <Header />
      <main className="min-h-[60vh] container mx-auto px-4 py-16 max-w-3xl">
        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : notFound ? (
          <div className="text-center py-24">
            <h1 className="font-heading text-3xl font-bold mb-2">Page not found</h1>
            <p className="text-muted-foreground mb-6">We couldn't find that page.</p>
            <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back home
            </Link>
          </div>
        ) : page && (
          <article className="prose prose-neutral dark:prose-invert max-w-none">
            <h1 className="font-heading text-4xl font-bold mb-6">{page.title}</h1>
            <div className="whitespace-pre-wrap text-base leading-relaxed">{page.content}</div>
          </article>
        )}
      </main>
      <Footer />
    </>
  );
}
