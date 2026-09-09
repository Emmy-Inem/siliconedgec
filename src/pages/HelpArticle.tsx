import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { SEO } from "@/components/SEO";
import { siteUrl } from "@/lib/site-url";
import { useEffect, useState } from "react";
import { MarkdownView } from "@/components/ai/MarkdownView";
import { useToast } from "@/hooks/use-toast";

export default function HelpArticle() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [voted, setVoted] = useState<"y" | "n" | null>(null);

  const { data: article, isLoading } = useQuery({
    queryKey: ["help-article", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await supabase
        .from("kb_articles")
        .select("id, title, summary, body, tags, updated_at, helpful_yes, helpful_no, category_id, kb_categories(title, slug)")
        .eq("slug", slug!)
        .eq("is_published", true)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (article?.id) {
      supabase.rpc as any;
      supabase.from("kb_articles").update({ views: ((article as any).views ?? 0) + 1 }).eq("id", article.id).then(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id]);

  const vote = async (kind: "y" | "n") => {
    if (voted || !article?.id) return;
    setVoted(kind);
    const field = kind === "y" ? "helpful_yes" : "helpful_no";
    await supabase.from("kb_articles")
      .update({ [field]: ((article as any)[field] ?? 0) + 1 })
      .eq("id", article.id);
    toast({ title: "Thanks for the feedback" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={article ? `${article.title} · Help Center` : "Help Center"}
        description={article?.summary ?? "Silicon Edge help articles."}
        canonical={article ? siteUrl(`/help/${article.slug}`) : siteUrl("/help")}
        jsonLd={article ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Help Center", item: siteUrl("/help") },
            { "@type": "ListItem", position: 3, name: article.title, item: siteUrl(`/help/${article.slug}`) },
          ],
        } : undefined}
      />
      <Header />
      <main className="flex-1 container mx-auto px-5 sm:px-6 py-10 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/help"><ChevronLeft className="h-4 w-4 mr-1" /> All articles</Link>
        </Button>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !article ? (
          <p className="text-center text-muted-foreground py-20">Article not found.</p>
        ) : (
          <article>
            <h1 className="font-heading text-3xl font-bold mb-2">{article.title}</h1>
            {article.summary && <p className="text-muted-foreground mb-6">{article.summary}</p>}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownView>{article.body || ""}</MarkdownView>
            </div>
            <div className="mt-10 pt-6 border-t border-border flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Was this helpful?</p>
              <div className="flex gap-2">
                <Button size="sm" variant={voted === "y" ? "default" : "outline"} disabled={!!voted} onClick={() => vote("y")}>
                  <ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> Yes
                </Button>
                <Button size="sm" variant={voted === "n" ? "default" : "outline"} disabled={!!voted} onClick={() => vote("n")}>
                  <ThumbsDown className="h-3.5 w-3.5 mr-1.5" /> No
                </Button>
              </div>
            </div>
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}