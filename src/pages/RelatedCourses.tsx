import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/CourseCard";
import { useCourse, useCourses } from "@/hooks/useCourses";
import { ChevronLeft, Loader2, Star } from "lucide-react";
import { courseHref } from "@/lib/course-url";
import { SEO } from "@/components/SEO";

export default function RelatedCourses() {
  const { id } = useParams<{ id: string }>();
  const { data: course } = useCourse(id);
  const { data: all = [], isLoading } = useCourses();

  const related = (all ?? [])
    .filter((c) => c.id !== course?.id)
    .map((c) => {
      let score = 0;
      if (course?.category && c.category === course.category) score += 3;
      if (course?.difficulty && c.difficulty === course.difficulty) score += 1;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.c);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={`Related courses · ${course?.title ?? "Course"}`} description="Other courses students take alongside this one." />
      <Header />
      <main className="flex-1 container mx-auto px-5 sm:px-6 py-8 max-w-6xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to={courseHref(course)}><ChevronLeft className="h-4 w-4 mr-1" /> Back to course</Link>
        </Button>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Star className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Related courses</h1>
            <p className="text-sm text-muted-foreground">Hand-picked next steps based on {course?.category ?? "this topic"}.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : related.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            We couldn't find similar courses right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((c) => (
              <CourseCard key={c.id} course={c as any} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}