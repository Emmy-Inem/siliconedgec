import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import type { DbCourse } from "@/hooks/useCourses";

type CourseHit = DbCourse;
interface PostHit { id: string; title: string; slug: string; excerpt: string | null }

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [courses, setCourses] = useState<CourseHit[]>([]);
  const [posts, setPosts] = useState<PostHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) { setCourses([]); setPosts([]); return; }
    setLoading(true);
    const term = `%${q}%`;
    Promise.all([
      supabase.from("courses").select("id,title,slug,category,thumbnail_url,description,difficulty,price,duration_hours,students_enrolled,rating,instructor_id,instructors(id,name,avatar_url)").or(`title.ilike.${term},description.ilike.${term}`).eq("is_published", true).limit(20),
      (supabase.from("blog_posts" as any).select("id,title,slug,excerpt").eq("status", "published").or(`title.ilike.${term},excerpt.ilike.${term}`).limit(20)),
    ]).then(([c, p]) => {
      const mapped = ((c.data as any[]) ?? []).map((r: any) => ({
        id: r.id, slug: r.slug, title: r.title, description: r.description ?? "",
        thumbnail_url: r.thumbnail_url, category: r.category ?? "",
        difficulty: r.difficulty ?? "Beginner", price: r.price ?? 0,
        duration_hours: r.duration_hours ?? 0, students_enrolled: r.students_enrolled ?? 0,
        rating: r.rating ?? 0,
        instructor: r.instructors ? { id: r.instructors.id, name: r.instructors.name, avatar_url: r.instructors.avatar_url } : null,
      })) as unknown as CourseHit[];
      setCourses(mapped);
      setPosts((p.data as unknown as PostHit[]) ?? []);
      setLoading(false);
    });
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(input ? { q: input } : {});
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title={q ? `Search: ${q}` : "Search"} description="Search across courses and blog posts." canonical="/search" noIndex={true} />
      <Header />
      <main className="container mx-auto px-5 sm:px-6 pt-20 pb-12 max-w-3xl">
        <h1 className="font-heading text-3xl font-bold mb-6">Search</h1>
        <form onSubmit={submit} className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search courses, articles…" className="pl-9" />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium">Search</button>
        </form>

        {loading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}

        {!loading && q && (
          <>
            <section className="mb-10">
              <h2 className="font-heading text-xl font-semibold mb-3">Courses ({courses.length})</h2>
              {courses.length === 0 ? <p className="text-muted-foreground text-sm">No matching courses.</p> : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {courses.map((c, i) => (<CourseCard key={c.id} course={c} index={i} />))}
                </div>
              )}
            </section>

            <section>
              <h2 className="font-heading text-xl font-semibold mb-3">Articles ({posts.length})</h2>
              {posts.length === 0 ? <p className="text-muted-foreground text-sm">No matching articles.</p> : (
                <ul className="space-y-2">
                  {posts.map((p) => (
                    <li key={p.id}><Link to={`/blog/${p.slug}`} className="block p-3 rounded-lg border border-border hover:border-primary/40">
                      <p className="font-medium">{p.title}</p>
                      {p.excerpt && <p className="text-xs text-muted-foreground line-clamp-1">{p.excerpt}</p>}
                    </Link></li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}