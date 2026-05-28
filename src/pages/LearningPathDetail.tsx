import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LearningPathDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: path } = useQuery({
    queryKey: ["learning-path", id],
    queryFn: async () => {
      const { data } = await supabase.from("learning_paths").select("*, learning_path_courses(course_id, order_index)").eq("id", id).eq("is_published", true).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const courseIds = (path?.learning_path_courses ?? []).sort((a: any, b: any) => a.order_index - b.order_index).map((c: any) => c.course_id);
  const { data: courses } = useQuery({
    queryKey: ["learning-path-courses", courseIds],
    queryFn: async () => {
      if (!courseIds.length) return [];
      const { data } = await supabase.from("courses").select("id, title, slug, thumbnail_url, duration_hours, difficulty").in("id", courseIds);
      return courseIds.map((cid: string) => (data ?? []).find((c: any) => c.id === cid)).filter(Boolean);
    },
    enabled: courseIds.length > 0,
  });

  const { data: completed } = useQuery({
    queryKey: ["my-completed", user?.id, courseIds],
    queryFn: async () => {
      if (!user || !courseIds.length) return new Set<string>();
      const { data } = await supabase.from("enrollments").select("course_id, is_completed").eq("user_id", user.id).in("course_id", courseIds);
      return new Set((data ?? []).filter((e: any) => e.is_completed).map((e: any) => e.course_id));
    },
    enabled: !!user && courseIds.length > 0,
  });

  if (!path) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading path…</main>
        <Footer />
      </>
    );
  }

  const done = (cid: string) => completed?.has(cid);
  const total = courses?.length ?? 0;
  const doneCount = (courses ?? []).filter((c: any) => done(c.id)).length;

  return (
    <>
      <SEO title={`${path.title} · Learning path`} description={path.description ?? undefined} />
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <Link to="/paths" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4 mr-1" />All paths</Link>
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-2">Learning path</p>
        <h1 className="font-heading text-3xl md:text-5xl font-bold mb-3">{path.title}</h1>
        <p className="text-muted-foreground mb-3">{path.description}</p>
        {user && total > 0 && (
          <div className="mb-6">
            <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(doneCount / total) * 100}%` }} /></div>
            <p className="text-xs text-muted-foreground mt-1">{doneCount} of {total} courses completed</p>
          </div>
        )}
        <ol className="space-y-3">
          {(courses ?? []).map((c: any, i: number) => (
            <li key={c.id} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4">
              <div className="text-2xl font-heading font-bold text-muted-foreground w-8">{i + 1}</div>
              {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title} className="h-16 w-24 rounded-lg object-cover" />}
              <div className="flex-1 min-w-0">
                <Link to={`/courses/${c.slug ?? c.id}`} className="font-semibold hover:text-primary">{c.title}</Link>
                <p className="text-xs text-muted-foreground capitalize">{c.difficulty} · {c.duration_hours}h</p>
              </div>
              {done(c.id) ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
            </li>
          ))}
        </ol>
      </main>
      <Footer />
    </>
  );
}