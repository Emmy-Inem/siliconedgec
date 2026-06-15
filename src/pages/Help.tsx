import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, Loader2, HelpCircle } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Help() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["help-index"],
    queryFn: async () => {
      const [{ data: cats }, { data: articles }] = await Promise.all([
        supabase.from("kb_categories").select("id, slug, title, description, icon, order_index").eq("is_published", true).order("order_index"),
        supabase.from("kb_articles").select("id, slug, title, summary, category_id, tags").eq("is_published", true).order("updated_at", { ascending: false }),
      ]);
      return { cats: cats ?? [], articles: articles ?? [] };
    },
  });

  const term = q.trim().toLowerCase();
  const filtered = (data?.articles ?? []).filter((a: any) =>
    !term || a.title.toLowerCase().includes(term) || (a.summary ?? "").toLowerCase().includes(term)
    || (a.tags ?? []).some((t: string) => t.toLowerCase().includes(term))
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Help Center · Silicon Edge" description="Guides, FAQs, and answers to common questions about courses, payments, certificates, and your account." />
      <Header />
      <main className="flex-1 container mx-auto px-5 sm:px-6 py-12 max-w-5xl">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-3">
            <HelpCircle className="h-3.5 w-3.5" /> Help Center
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">How can we help you?</h1>
          <p className="text-muted-foreground mt-2">Browse guides or search for an answer.</p>
          <div className="relative max-w-xl mx-auto mt-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the help center…" className="pl-10 h-12" />
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : term ? (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Results ({filtered.length})</h2>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No articles match your search.</p>
            ) : (
              <ul className="space-y-2">
                {filtered.map((a: any) => (
                  <li key={a.id}>
                    <Link to={`/help/${a.slug}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40">
                      <p className="font-medium">{a.title}</p>
                      {a.summary && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{a.summary}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {(data?.cats ?? []).map((c: any) => {
              const arts = (data?.articles ?? []).filter((a: any) => a.category_id === c.id).slice(0, 5);
              return (
                <article key={c.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-lg font-semibold">{c.title}</h2>
                  </div>
                  {c.description && <p className="text-sm text-muted-foreground mb-3">{c.description}</p>}
                  <ul className="space-y-1.5">
                    {arts.map((a: any) => (
                      <li key={a.id}>
                        <Link to={`/help/${a.slug}`} className="text-sm text-foreground hover:text-primary hover:underline">
                          {a.title}
                        </Link>
                      </li>
                    ))}
                    {arts.length === 0 && <li className="text-xs text-muted-foreground italic">No articles yet.</li>}
                  </ul>
                </article>
              );
            })}
            {(data?.cats ?? []).length === 0 && (
              <div className="sm:col-span-2 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                The help center is being prepared. Check back soon.
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}