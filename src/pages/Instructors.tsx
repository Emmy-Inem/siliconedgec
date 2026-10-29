import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { usePublicInstructors } from "@/hooks/usePublicInstructors";
import { ArrowUpRight, BookOpen, Loader2, Users } from "lucide-react";

/** First sentence of a bio, used as the one-line card summary. */
function firstSentence(bio: string): string {
  const normalized = bio.split("\n")[0].trim();
  const match = normalized.match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : normalized).trim();
}

export default function Instructors() {
  const { data: items = [], isLoading: loading, isError, refetch } = usePublicInstructors();

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Our Instructors — Meet Your Teaching Team" description="Meet the Silicon Edge Consulting instructors teaching cloud engineering, generative AI, cybersecurity, data engineering and software development." canonical="/instructors" />
      <Header />

      {/* Hero — site-wide page hero pattern */}
      <section className="bg-secondary pt-header pb-10 md:pb-14 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-3xl pt-6 md:pt-10">
            <p className="text-xs text-muted-foreground font-semibold mb-4">THE PEOPLE BEHIND YOUR LEARNING</p>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Meet your instructors.
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Get to know the people teaching your next course — their subjects, their approach, and where they can help you build your understanding.
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-5 sm:px-6 py-10 md:py-14">
        <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
          <h2 className="font-heading text-2xl font-semibold">The teaching team</h2>
          <span className="text-sm text-muted-foreground">Cloud · AI · Security · Data · Software</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : isError ? (
          <div role="alert" className="py-10"><p className="text-muted-foreground mb-4">We couldn’t load the teaching team.</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">No instructors listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((i) => (
              <article key={i.id} className="group rounded-lg border border-border bg-card overflow-hidden flex flex-col">
                <Link to={`/instructors/${i.id}`} aria-label={`Meet ${i.name}`} className="block aspect-[4/3] overflow-hidden bg-muted">
                  {i.avatar_url ? (
                    <img src={i.avatar_url} alt={i.name} loading="lazy" className="w-full h-full object-cover object-top transition-transform duration-300 motion-safe:group-hover:scale-105" />
                  ) : (
                    <div className="h-full flex items-center justify-center font-heading text-4xl text-foreground">
                      {i.name.charAt(0)}
                    </div>
                  )}
                </Link>
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  <h3 className="font-heading text-xl font-semibold mb-1">{i.name}</h3>
                  {i.role && <p className="text-sm font-medium text-foreground mb-4">{i.role}</p>}
                  {i.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-5">{firstSentence(i.bio)}</p>}
                  <div className="mt-auto">
                    {i.courses.length > 0 && <div className="border-t border-border pt-4 mb-4"><p className="text-xs text-muted-foreground flex items-center gap-2 mb-2"><BookOpen className="h-3.5 w-3.5" /> Teaching</p><p className="text-sm leading-relaxed">{i.courses.map(c => c.title).join(" · ")}</p></div>}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                  {i.students_count != null && i.students_count > 0 && (<span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {i.students_count.toLocaleString()} students</span>)}
                      <Button asChild variant="link" className="p-0 h-auto"><Link to={`/instructors/${i.id}`}>Meet {i.name.split(" ")[0]} <ArrowUpRight className="h-4 w-4" /></Link></Button>
                    </div>
                  </div>
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