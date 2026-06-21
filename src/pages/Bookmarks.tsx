import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Loader2, BookmarkX } from "lucide-react";

interface Course {
  id: string;
  title: string;
  slug: string | null;
  thumbnail_url: string | null;
  short_description: string | null;
  category: string | null;
  price: number | null;
}

export default function Bookmarks() {
  const { user, loading: authLoading } = useAuth();
  const { bookmarks, isLoading, toggleBookmark } = useBookmarks();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookmarks.length) { setCourses([]); setLoading(false); return; }
    (async () => {
      const ids = bookmarks.map((b) => b.course_id);
      const { data } = await supabase
        .from("courses")
        .select("id,title,slug,thumbnail_url,short_description,category,price")
        .in("id", ids);
      setCourses((data as Course[]) ?? []);
      setLoading(false);
    })();
  }, [bookmarks]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/sign-in?redirect=/bookmarks" replace />;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="My Saved Courses" description="Courses you've bookmarked for later." canonical="/bookmarks" />
      <Header />
      <main className="container mx-auto px-5 sm:px-6 py-12">
        <h1 className="font-heading text-3xl font-bold mb-2">Saved Courses</h1>
        <p className="text-muted-foreground mb-8">Courses you bookmarked to review later.</p>

        {(isLoading || loading) ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground mb-4">You haven't bookmarked any courses yet.</p>
            <Link to="/courses" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium inline-block">Browse Courses</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
                <Link to={`/courses/${c.slug || c.id}`}>
                  {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title} loading="lazy" className="w-full aspect-video object-cover" />}
                </Link>
                <div className="p-5 flex-1 flex flex-col">
                  {c.category && <p className="text-xs text-primary uppercase mb-1">{c.category}</p>}
                  <Link to={`/courses/${c.slug || c.id}`} className="font-heading font-semibold mb-2 hover:text-primary">{c.title}</Link>
                  {c.short_description && <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{c.short_description}</p>}
                  <div className="mt-auto flex items-center justify-between">
                    {c.price != null && <span className="font-semibold">₦{Number(c.price).toLocaleString()}</span>}
                    <button onClick={() => toggleBookmark(c.id)} className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
                      <BookmarkX className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}