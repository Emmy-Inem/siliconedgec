import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function titleCase(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CategoryCourses() {
  const { slug = "" } = useParams();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const name = titleCase(slug);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("courses")
        .select("id, slug, title, description, thumbnail_url, category, difficulty_level, price_naira")
        .ilike("category", name)
        .eq("is_published", true);
      setCourses(data ?? []);
      setLoading(false);
    })();
  }, [name]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${name} Courses | Silicon Edge`}
        description={`Browse expert-led ${name} courses. Job-ready training in AI, Cloud, DevOps and more.`}
        canonical={`/category/${slug}`}
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
            {courses.map((c) => (
              <Link key={c.id} to={`/courses/${c.slug || c.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition">
                  {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title} className="aspect-video object-cover w-full" loading="lazy" />}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex gap-2">
                      <Badge variant="secondary">{c.difficulty_level}</Badge>
                    </div>
                    <h2 className="font-semibold line-clamp-2">{c.title}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}