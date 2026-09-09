import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { siteUrl } from "@/lib/site-url";
import { Loader2 } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import type { DbCourse } from "@/hooks/useCourses";

function titleCase(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CategoryCourses() {
  const { slug = "" } = useParams();
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const name = titleCase(slug);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("courses")
        .select("id, slug, title, description, thumbnail_url, category, difficulty, price, duration_hours, students_enrolled, rating, instructor_id, instructors(id, name, avatar_url)")
        .ilike("category", name)
        .eq("is_published", true);
      const mapped = (data ?? []).map((c: any) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description ?? "",
        thumbnail_url: c.thumbnail_url,
        category: c.category ?? "",
        difficulty: c.difficulty ?? "Beginner",
        price: c.price ?? 0,
        duration_hours: c.duration_hours ?? 0,
        students_enrolled: c.students_enrolled ?? 0,
        rating: c.rating ?? 0,
        instructor: c.instructors
          ? { id: c.instructors.id, name: c.instructors.name, avatar_url: c.instructors.avatar_url }
          : null,
      })) as unknown as DbCourse[];
      setCourses(mapped);
      setLoading(false);
    })();
  }, [name]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl("/") },
          { "@type": "ListItem", "position": 2, "name": "Courses", "item": siteUrl("/courses") },
          { "@type": "ListItem", "position": 3, "name": `${name} Courses`, "item": siteUrl(`/category/${slug}`) },
        ],
      },
      ...(courses.length > 0 ? [{
        "@type": "ItemList",
        "name": `${name} Courses`,
        "itemListElement": courses.slice(0, 10).map((c, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": c.title,
          "url": siteUrl(`/courses/${c.slug || c.id}`),
        })),
      }] : []),
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${name} Courses | Silicon Edge`}
        description={`Browse expert-led ${name} courses. Job-ready training in AI, Cloud, DevOps and more.`}
        canonical={siteUrl(`/category/${slug}`)}
        jsonLd={jsonLd}
      />
      <Header />
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{name} Courses</h1>
        <p className="text-muted-foreground mb-8">Hands-on programs designed for working professionals.</p>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : !courses.length ? (
          <p className="text-muted-foreground">No courses found in this category. <Link to="/courses" className="text-primary underline">Browse all courses</Link>.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}