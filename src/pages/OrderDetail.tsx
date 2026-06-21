import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Loader2 } from "lucide-react";

interface Order {
  id: string;
  reference: string;
  paystack_reference: string | null;
  amount: number;
  currency: string;
  discount_amount: number | null;
  status: string;
  created_at: string;
  course_id: string;
}
interface Course { id: string; title: string; slug: string | null; thumbnail_url: string | null }

export default function OrderDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: o } = await supabase
        .from("orders")
        .select("id,reference,paystack_reference,amount,currency,discount_amount,status,created_at,course_id")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!o) { setNotFound(true); setLoading(false); return; }
      setOrder(o as Order);
      const { data: c } = await supabase.from("courses").select("id,title,slug,thumbnail_url").eq("id", o.course_id).maybeSingle();
      setCourse(c as Course | null);
      setLoading(false);
    })();
  }, [user, id]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to={`/sign-in?redirect=/orders/${id}`} replace />;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Order Details" description="Receipt and details for your order." canonical={`/orders/${id}`} />
      <Header />
      <main className="container mx-auto px-5 sm:px-6 py-12 max-w-2xl">
        <Link to="/account" className="text-sm text-muted-foreground hover:text-primary">← Back to account</Link>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : notFound || !order ? (
          <div className="py-20 text-center"><p className="text-muted-foreground">Order not found.</p></div>
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="font-heading text-2xl font-bold">Order receipt</h1>
              <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary capitalize">{order.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">Reference</p><p className="font-mono">{order.reference}</p></div>
              {order.paystack_reference && <div><p className="text-muted-foreground">Paystack ref</p><p className="font-mono text-xs">{order.paystack_reference}</p></div>}
              <div><p className="text-muted-foreground">Date</p><p>{new Date(order.created_at).toLocaleString()}</p></div>
              <div><p className="text-muted-foreground">Amount</p><p className="font-semibold">{order.currency} {Number(order.amount).toLocaleString()}</p></div>
              {order.discount_amount ? <div><p className="text-muted-foreground">Discount</p><p>-{order.currency} {Number(order.discount_amount).toLocaleString()}</p></div> : null}
            </div>
            {course && (
              <Link to={`/courses/${course.slug || course.id}`} className="flex items-center gap-4 rounded-xl border border-border p-3 hover:border-primary/40">
                {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.title} className="w-20 h-14 object-cover rounded" loading="lazy" />}
                <div><p className="font-medium">{course.title}</p><p className="text-xs text-muted-foreground">View course</p></div>
              </Link>
            )}
            <a href={`/verify-receipt/${order.paystack_reference || order.reference}`} className="block w-full text-center px-4 py-2 rounded-lg border border-border text-sm font-medium">Open verification page</a>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}