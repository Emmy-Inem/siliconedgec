import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Loader2, Star, Quote, Play } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  rating: number | null;
  avatar_url: string | null;
  media_type: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
}

/** Turn a YouTube/Vimeo watch URL into an embeddable one; direct files pass through. */
function embedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}?autoplay=1`;
  return url;
}

function isFileVideo(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export default function Testimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Testimonial | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("id,name,role,quote,rating,avatar_url,media_type,video_url,thumbnail_url")
        .or("is_published.is.null,is_published.eq.true")
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
            {items.map((t) => {
              const isVideo = t.media_type === "video" && !!t.video_url;
              return (
              <article key={t.id} className="rounded-2xl border border-border bg-card p-6">
                {isVideo ? (
                  <button
                    type="button"
                    onClick={() => setActive(t)}
                    aria-label={`Play video testimonial from ${t.name}`}
                    className="group relative w-full aspect-video rounded-xl overflow-hidden mb-4 bg-muted"
                  >
                    {t.thumbnail_url ? (
                      <img src={t.thumbnail_url} alt={`${t.name} video testimonial`} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/25 to-primary/5" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-14 w-14 rounded-full bg-background/85 backdrop-blur flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                        <Play className="h-6 w-6 text-primary fill-current ml-0.5" />
                      </span>
                    </span>
                  </button>
                ) : (
                  <Quote className="h-6 w-6 text-primary/60 mb-3" />
                )}
                {t.quote && <p className="text-sm leading-relaxed mb-5">{t.quote}</p>}
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
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {active?.video_url && (
            isFileVideo(active.video_url) ? (
              <video src={active.video_url} controls autoPlay className="w-full aspect-video bg-black" />
            ) : (
              <iframe
                src={embedUrl(active.video_url)}
                title={`${active.name} video testimonial`}
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="w-full aspect-video bg-black border-0"
              />
            )
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}