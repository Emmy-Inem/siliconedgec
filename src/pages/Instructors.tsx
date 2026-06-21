import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Loader2, Star, Users } from "lucide-react";

interface Instructor {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  avatar_url: string | null;
  rating: number | null;
  students_count: number | null;
  courses_count: number | null;
}

export default function Instructors() {
  const [items, setItems] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("instructors")
        .select("id,name,role,bio,avatar_url,rating,students_count,courses_count")
        .order("rating", { ascending: false, nullsFirst: false });
      setItems((data as Instructor[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Our Instructors — Expert Mentors" description="Meet the senior engineers and architects teaching live cohorts at Silicon Edge Consulting." canonical="/instructors" />
      <Header />
      <main className="container mx-auto px-5 sm:px-6 py-16">
        <header className="max-w-2xl mb-10">
          <h1 className="font-heading text-4xl font-bold mb-3">Instructors</h1>
          <p className="text-muted-foreground">Industry practitioners with deep experience shipping production systems.</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">No instructors listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((i) => (
              <Link key={i.id} to={`/instructors/${i.id}`} className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  {i.avatar_url ? (
                    <img src={i.avatar_url} alt={i.name} loading="lazy" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center font-heading text-xl text-primary">
                      {i.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-heading font-semibold">{i.name}</h3>
                    {i.role && <p className="text-sm text-muted-foreground">{i.role}</p>}
                  </div>
                </div>
                {i.bio && <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{i.bio}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {i.rating != null && (<span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-current text-amber-500" /> {Number(i.rating).toFixed(1)}</span>)}
                  {i.students_count != null && (<span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {i.students_count.toLocaleString()} students</span>)}
                  {i.courses_count != null && <span>{i.courses_count} courses</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}