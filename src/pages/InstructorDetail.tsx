import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Users, BookOpen, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { CourseCard } from "@/components/CourseCard";

export default function InstructorDetail() {
  const { id } = useParams();

  const { data: instructor, isLoading } = useQuery({
    queryKey: ["instructor", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instructors")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["instructor-courses", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, category, price, difficulty, duration_hours, thumbnail_url, rating, students_enrolled")
        .eq("instructor_id", id!)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
          <h1 className="font-heading text-2xl font-bold mb-4">Instructor not found</h1>
          <Button asChild><Link to="/courses">Browse Courses</Link></Button>
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
      />
      <Header />

      <section className="bg-hero pt-28 pb-12">
        <div className="container mx-auto px-4">
          <Link to="/courses" className="inline-flex items-center text-hero-muted hover:text-primary text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Courses
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row gap-6 items-start"
          >
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 border-4 border-background shadow-xl">
              {instructor.avatar_url ? (
                <img src={instructor.avatar_url} alt={instructor.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-heading font-bold text-primary text-4xl">
                  {instructor.name.split(" ").map((n: string) => n[0]).join("")}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-hero mb-2">{instructor.name}</h1>
              {instructor.role && <p className="text-primary font-medium text-base mb-3">{instructor.role}</p>}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-hero-muted text-sm">
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  {instructor.rating ?? 4.5} Instructor Rating
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {(instructor.students_count ?? 0).toLocaleString()} Students
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {courses.length} Course{courses.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-10 md:py-12">
        <div className="container mx-auto px-4 space-y-10">
          {instructor.bio && (
            <div className="max-w-3xl">
              <h2 className="font-heading text-xl font-bold mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{instructor.bio}</p>
            </div>
          )}

          <div>
            <h2 className="font-heading text-xl font-bold mb-5">Courses by {instructor.name}</h2>
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published courses yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.map((c: any) => (
                  <CourseCard
                    key={c.id}
                    course={{
                      id: c.id,
                      title: c.title,
                      description: c.description ?? "",
                      category: c.category,
                      price: c.price,
                      difficulty: c.difficulty,
                      duration_hours: c.duration_hours,
                      thumbnail_url: c.thumbnail_url,
                      rating: c.rating,
                      students_enrolled: c.students_enrolled,
                    } as any}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
