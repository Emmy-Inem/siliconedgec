import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Loader2, Star, Quote } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  rating: number | null;
  avatar_url: string | null;
}

export default function Testimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("id,name,role,quote,rating,avatar_url")
        .order("order_index", { ascending: true, nullsFirst: false });
      setItems((data as Testimonial[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Student Testimonials & Success Stories" description="Hear from learners who completed our programs and accelerated their careers." canonical="/testimonials" />
      <Header />
      <main className="container mx-auto px-5 sm:px-6 py-16">
        <header className="max-w-2xl mb-10">
          <h1 className="font-heading text-4xl font-bold mb-3">What Our Students Say</h1>
          <p className="text-muted-foreground">Real outcomes from real cohorts.</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">No testimonials yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((t) => (
              <article key={t.id} className="rounded-2xl border border-border bg-card p-6">
                <Quote className="h-6 w-6 text-primary/60 mb-3" />
                <p className="text-sm leading-relaxed mb-5">{t.quote}</p>
                <div className="flex items-center gap-3">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt={t.name} loading="lazy" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">{t.name.charAt(0)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    {t.role && <p className="text-xs text-muted-foreground truncate">{t.role}</p>}
                  </div>
                  {t.rating != null && (
                    <span className="flex items-center gap-1 text-xs text-amber-500"><Star className="h-3.5 w-3.5 fill-current" />{Number(t.rating).toFixed(1)}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}