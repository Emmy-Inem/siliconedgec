import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Loader2, ExternalLink, Download, ShoppingCart, Package, ShieldCheck } from "lucide-react";
import { formatNaira } from "@/lib/format-currency";
import { downloadReceiptPdf } from "@/lib/receipt-pdf";
import { motion } from "framer-motion";

interface OrderRow {
  id: string;
  reference: string;
  paystack_reference: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  course_id: string;
  course_title?: string;
}

export function Receipts() {
  const { user } = useAuth();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: orders } = await supabase
        .from("orders")
        .select("id, reference, paystack_reference, amount, currency, status, created_at, course_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set((orders ?? []).map((o) => o.course_id)));
      const { data: courses } = ids.length
        ? await supabase.from("courses").select("id, title").in("id", ids)
        : { data: [] as { id: string; title: string }[] };
      const titleMap = new Map((courses ?? []).map((c) => [c.id, c.title]));
      setRows(((orders ?? []) as OrderRow[]).map((o) => ({ ...o, course_title: titleMap.get(o.course_id) ?? "Course" })));
      setLoading(false);
    })();
  }, [user]);

  // Group by reference (cart-* references span multiple rows)
  const grouped = rows.reduce<Record<string, OrderRow[]>>((acc, r) => {
    const key = r.reference.startsWith("cart-") ? r.reference.split("--")[0] : r.reference;
    (acc[key] = acc[key] ?? []).push(r);
    return acc;
  }, {});

  const groups = Object.entries(grouped).sort(
    (a, b) => +new Date(b[1][0].created_at) - +new Date(a[1][0].created_at)
  );

  const handleDownload = (ref: string, items: OrderRow[]) => {
    const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    downloadReceiptPdf({
      reference: ref,
      customerName: user?.email ?? "Customer",
      customerEmail: user?.email ?? "",
      lines: items.map((i) => ({ title: i.course_title ?? "Course", amount: Number(i.amount || 0) })),
      total,
      currency: items[0].currency,
      date: new Date(items[0].created_at),
    });
  };

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-20">
        <Receipt className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="font-heading text-xl font-semibold mb-2">No receipts yet</h2>
        <p className="text-muted-foreground mb-6">Your purchase history will appear here.</p>
        <Button asChild><Link to="/courses">Browse Courses</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(([ref, items], i) => {
        const total = items.reduce((s, r) => s + Number(r.amount || 0), 0);
        const status = items[0].status;
        const isCart = items.length > 1 || ref.startsWith("cart-");
        const allRefunded = items.every((r) => r.status === "refunded");
        const anyPaid = items.some((r) => ["paid", "success", "completed"].includes(r.status));
        const verdict = allRefunded ? "refunded" : anyPaid ? "paid" : status;

        return (
          <motion.div key={ref} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {isCart ? <ShoppingCart className="h-5 w-5 text-primary" /> : <Package className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">
                        {isCart ? `${items.length} courses` : items[0].course_title}
                      </p>
                      <Badge
                        variant={verdict === "paid" ? "default" : verdict === "refunded" ? "destructive" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {verdict}
                      </Badge>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground/70 truncate">{ref}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(items[0].created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                    <p className="font-heading text-lg font-bold text-primary whitespace-nowrap">{formatNaira(total)}</p>
                    <div className="flex gap-1">
                      {anyPaid && (
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(ref, items)} title="Download PDF">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild title="Verify receipt">
                        <Link to={`/verify-receipt/${encodeURIComponent(ref)}`}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {!isCart && (
                        <Button size="sm" variant="ghost" asChild title="View course">
                          <Link to={`/courses/${items[0].course_id}`}><ExternalLink className="h-3.5 w-3.5" /></Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {isCart && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1">
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">{it.course_title}</span>
                        <span className="font-medium">{formatNaira(Number(it.amount || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
