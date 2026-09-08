import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { SEO } from "@/components/SEO";

const db = supabase as any;

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80&auto=format&fit=crop",
];
const coverFor = (id: string) => {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COVER_IMAGES[h % COVER_IMAGES.length];
};

export default function Cohorts() {
  const { user, loading: authLoading } = useAuth();
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: memberships } = await db.from("cohort_members").select("cohort_id, role").eq("user_id", user.id);
      const ids = (memberships || []).map((m: any) => m.cohort_id);
      if (ids.length === 0) { setCohorts([]); setLoading(false); return; }
      const { data: rows } = await db.from("cohorts").select("*").in("id", ids).order("status").order("start_date", { ascending: false });
      setCohorts(rows || []);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return (
    <div className="min-h-screen flex flex-col">
      <Helmet><title>Cohorts | Silicon Edge</title></Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="font-heading text-2xl font-bold mb-3">Sign in to view your cohorts</h1>
        <Link to="/sign-in" className="text-primary underline">Sign in</Link>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet><title>My Cohorts | Silicon Edge</title></Helmet>
      <SEO
        title="My Cohorts"
        description="Your private Silicon Edge learning cohorts — discussions, live sessions, leaderboards and shared materials with your peers and instructors."
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-20 pb-10">
        <h1 className="font-heading text-3xl font-bold mb-2">My Cohorts</h1>
        <p className="text-muted-foreground mb-8">Private learning groups with your peers, instructors, and live sessions.</p>
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : cohorts.length === 0 ? (
          <Card className="p-10 text-center max-w-lg mx-auto">
            <h2 className="font-heading text-lg font-semibold mb-1">You haven't joined a cohort yet</h2>
            <p className="text-sm text-muted-foreground">When an instructor adds you to a cohort, it will appear here with discussion, sessions, and shared materials.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cohorts.map((c) => (
              <Link key={c.id} to={`/cohorts/${c.id}`} className="group">
                <Card className="h-full overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all">
                  <div className="relative h-32 overflow-hidden">
                    <img src={coverFor(c.id)} alt={`${c.name} cohort cover`} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                    <Badge variant="outline" className="absolute top-3 left-3 bg-background/80 backdrop-blur">{c.status}</Badge>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h2 className="font-heading text-lg font-semibold leading-tight">{c.name}</h2>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                    {c.start_date && <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5"><Users className="h-3 w-3" />{c.start_date} → {c.end_date || "ongoing"}</p>}
                  </div>
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