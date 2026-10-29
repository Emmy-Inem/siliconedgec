import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpRight, Users, BookOpen, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { siteUrl } from "@/lib/site-url";
import { CourseCard } from "@/components/CourseCard";
import { usePublicInstructors } from "@/hooks/usePublicInstructors";

export default function InstructorDetail() {
  const { id } = useParams();

  const { data: instructors = [], isLoading, isError, refetch } = usePublicInstructors();
  const instructor = instructors.find(item => item.id === id);

  const { data: courses = [] } = useQuery({
    queryKey: ["instructor-courses", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("instructor_id", id)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-40">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">{isError ? "We couldn’t load this instructor" : "Instructor not found"}</h1>
          {isError ? <Button variant="outline" onClick={() => refetch()}>Try again</Button> : <Button asChild><Link to="/instructors">Meet the teaching team</Link></Button>}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${instructor.name} — Instructor at Silicon Edge`}
        description={(instructor.bio ?? `Learn from ${instructor.name}, ${instructor.role ?? "expert instructor"} at Silicon Edge.`).slice(0, 155)}
        image={instructor.avatar_url ?? undefined}
        canonical={siteUrl(`/instructors/${instructor.id}`)}
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
                { "@type": "ListItem", position: 2, name: "Instructors", item: siteUrl("/instructors") },
                { "@type": "ListItem", position: 3, name: instructor.name, item: siteUrl(`/instructors/${instructor.id}`) },
              ],
            },
            {
              "@type": "Person",
              name: instructor.name,
              jobTitle: instructor.role ?? "Technical Instructor",
              description: instructor.bio ?? undefined,
              image: instructor.avatar_url ?? undefined,
              worksFor: {
                "@type": "Organization",
                name: "Silicon Edge Consulting",
                url: siteUrl("/"),
              },
            },
          ],
        }}
      />
      <Header />

      <main>
      <section className="bg-secondary pt-header pb-10 md:pb-14 border-b border-border">
        <div className="container mx-auto px-5 sm:px-6 pt-4 md:pt-8">
          <Link to="/instructors" className="inline-flex items-center text-muted-foreground hover:text-primary text-sm mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" /> All instructors
          </Link>
          <div className="flex flex-col sm:flex-row gap-7 md:gap-10 items-start sm:items-center">
            <div className="w-40 h-48 md:w-52 md:h-60 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {instructor.avatar_url ? (
                <img src={instructor.avatar_url} alt={instructor.name} className="w-full h-full object-cover object-top" />
              ) : (
                <span className="font-heading font-bold text-foreground text-4xl">
                  {instructor.name.split(" ").map((n: string) => n[0]).join("")}
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-semibold mb-3">SILICON EDGE CONSULTING · INSTRUCTOR</p>
              <h1 className="font-heading text-3xl md:text-4xl font-bold mb-3">{instructor.name}</h1>
              {instructor.role && <p className="font-medium text-base md:text-lg mb-6">{instructor.role}</p>}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-muted-foreground text-sm">
                {(instructor.students_count ?? 0) > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {Number(instructor.students_count).toLocaleString()} Students
                </span>
                )}
                {instructor.courses.length > 0 && <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {instructor.courses.length} published course{instructor.courses.length !== 1 ? "s" : ""}
                </span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12">
        <div className="container mx-auto px-5 sm:px-6 space-y-12">
          {instructor.bio && (
            <div className="grid md:grid-cols-[1fr_2fr] gap-6 md:gap-12 border-b border-border pb-10 md:pb-12">
              <div><p className="text-xs text-muted-foreground mb-3">THE INSTRUCTOR</p><h2 className="font-heading text-2xl font-semibold">About {instructor.name.split(" ")[0]}</h2></div>
              <div className="max-w-3xl space-y-5">{instructor.bio.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index} className="text-muted-foreground leading-relaxed">{paragraph}</p>)}</div>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6"><h2 className="font-heading text-2xl font-semibold">Learn with {instructor.name.split(" ")[0]}</h2><Button asChild variant="link" className="p-0"><Link to="/courses">All courses <ArrowUpRight className="h-4 w-4" /></Link></Button></div>
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published courses yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={{
                      ...c,
                      modules: [],
                      instructor: { id: instructor.id, name: instructor.name, bio: instructor.bio, avatar_url: instructor.avatar_url },
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      </main>
      <Footer />
    </div>
  );
}
