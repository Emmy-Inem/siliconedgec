import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Calendar, CreditCard, Package, ShoppingCart, ArrowLeft, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { formatNaira } from "@/lib/format-currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";

type Verdict = "loading" | "valid" | "refunded" | "pending" | "failed" | "not_found";

export default function VerifyReceipt() {
  const { reference } = useParams<{ reference: string }>();
  const [verdict, setVerdict] = useState<Verdict>("loading");
  const [orders, setOrders] = useState<any[]>([]);
  const [courseTitles, setCourseTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!reference) return;
    (async () => {
      // Match a single reference OR a cart-* prefix used by line items
      const { data } = await supabase
        .from("orders")
        .select("*")
        .or(`reference.eq.${reference},reference.like.${reference}--%`)
        .order("created_at", { ascending: true });

      if (!data || data.length === 0) {
        setVerdict("not_found");
        return;
      }
      setOrders(data);

      const ids = Array.from(new Set(data.map((o: any) => o.course_id)));
      const { data: cs } = await supabase.from("courses").select("id, title").in("id", ids);
      const titles: Record<string, string> = {};
      (cs ?? []).forEach((c: any) => (titles[c.id] = c.title));
      setCourseTitles(titles);

      const statuses = data.map((o: any) => o.status);
      if (statuses.every((s: string) => s === "refunded")) setVerdict("refunded");
      else if (statuses.some((s: string) => ["paid", "success", "completed"].includes(s))) setVerdict("valid");
      else if (statuses.some((s: string) => s === "failed")) setVerdict("failed");
      else setVerdict("pending");
    })();
  }, [reference]);

  const isCart = (orders[0]?.reference ?? "").startsWith("cart-") || orders.length > 1;
  const total = orders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const created = orders[0]?.created_at;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Verify Receipt — Silicon Edge Consulting" description="Verify the authenticity of a Silicon Edge Consulting payment receipt." noIndex />
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-20 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back home</Link>
        </Button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <ShieldCheck className="h-3.5 w-3.5" /> Receipt Verification
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Receipt Authenticity Check</h1>
            <p className="text-muted-foreground font-mono text-sm break-all">{reference}</p>
          </div>

          {verdict === "loading" && (
            <Card><CardContent className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></CardContent></Card>
          )}

          {verdict === "not_found" && (
            <Card className="border-destructive/30">
              <CardContent className="p-8 text-center space-y-3">
                <XCircle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="font-heading text-xl font-bold">Receipt Not Found</h2>
                <p className="text-muted-foreground">No order matches this reference. The receipt may be invalid, fabricated, or from a different platform.</p>
              </CardContent>
            </Card>
          )}

          {verdict === "valid" && (
            <ValidCard isCart={isCart} orders={orders} courseTitles={courseTitles} total={total} created={created} />
          )}

          {verdict === "refunded" && (
            <Card className="border-amber-500/40">
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center gap-3 text-amber-500">
                  <AlertCircle className="h-8 w-8" />
                  <div>
                    <h2 className="font-heading text-xl font-bold">Refunded</h2>
                    <p className="text-sm text-muted-foreground">This receipt was issued, but the payment has since been refunded.</p>
                  </div>
                </div>
                <ReceiptDetails orders={orders} courseTitles={courseTitles} total={total} created={created} />
              </CardContent>
            </Card>
          )}

          {verdict === "pending" && (
            <Card><CardContent className="p-8 text-center space-y-3">
              <Loader2 className="h-12 w-12 text-muted-foreground mx-auto" />
              <h2 className="font-heading text-xl font-bold">Pending</h2>
              <p className="text-muted-foreground">Payment for this order has not yet been completed.</p>
            </CardContent></Card>
          )}

          {verdict === "failed" && (
            <Card className="border-destructive/30"><CardContent className="p-8 text-center space-y-3">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="font-heading text-xl font-bold">Failed Payment</h2>
              <p className="text-muted-foreground">This transaction did not complete successfully.</p>
            </CardContent></Card>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

function ValidCard({ isCart, orders, courseTitles, total, created }: any) {
  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardContent className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold">Receipt Verified</h2>
            <p className="text-sm text-muted-foreground">This is an authentic Silicon Edge Consulting payment.</p>
          </div>
          <Badge variant={isCart ? "default" : "outline"} className="ml-auto gap-1">
            {isCart ? <ShoppingCart className="h-3 w-3" /> : <Package className="h-3 w-3" />}
            {isCart ? "Cart checkout" : "Single course"}
          </Badge>
        </div>
        <ReceiptDetails orders={orders} courseTitles={courseTitles} total={total} created={created} />
      </CardContent>
    </Card>
  );
}

function ReceiptDetails({ orders, courseTitles, total, created }: any) {
  return (
    <div className="space-y-4 pt-2">
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Issued:</span>
          <span className="font-medium">{created ? new Date(created).toLocaleString() : "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Total:</span>
          <span className="font-bold text-primary">{formatNaira(total)}</span>
        </div>
      </div>
      <div className="border border-border rounded-xl divide-y divide-border">
        {orders.map((o: any) => (
          <div key={o.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{courseTitles[o.course_id] ?? "Course"}</p>
              <p className="text-[10px] font-mono text-muted-foreground truncate">{o.reference}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">{formatNaira(Number(o.amount || 0))}</p>
              <Badge variant={["paid","success","completed"].includes(o.status) ? "default" : o.status === "refunded" ? "destructive" : "secondary"} className="text-[10px] capitalize">{o.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
