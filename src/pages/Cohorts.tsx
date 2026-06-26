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

const db = supabase as any;

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
      <main className="flex-1 container mx-auto px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold mb-3">Sign in to view your cohorts</h1>
        <Link to="/sign-in" className="text-primary underline">Sign in</Link>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet><title>My Cohorts | Silicon Edge</title></Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10">
        <h1 className="font-heading text-3xl font-bold mb-2">My Cohorts</h1>
        <p className="text-muted-foreground mb-8">Private learning groups with your peers, instructors, and live sessions.</p>
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : cohorts.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">You haven't been added to a cohort yet.</Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cohorts.map((c) => (
              <Link key={c.id} to={`/cohorts/${c.id}`}>
                <Card className="p-5 h-full hover:border-primary/40 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{c.status}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h2 className="font-heading text-lg font-semibold mb-1">{c.name}</h2>
                  {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                  {c.start_date && <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5"><Users className="h-3 w-3" />{c.start_date} → {c.end_date || "ongoing"}</p>}
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