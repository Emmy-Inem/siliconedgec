import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DollarSign, TrendingUp, ArrowDownRight, Receipt, Download, Wallet, BadgePercent } from "lucide-react";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const PAID = ["paid", "success", "completed", "confirmed"];

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminFinanceLedger() {
  const { format } = useLocalizedPrice();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["finance-ledger"],
    queryFn: async () => {
      const [orders, courses, refunds, payouts, referrals] = await Promise.all([
        fetchAllRows<any>("orders", "id, amount, status, course_id, created_at, discount_amount"),
        fetchAllRows<any>("courses", "id, title"),
        (supabase as any).from("finance_refunds").select("amount, status, created_at").then((r: any) => r.data ?? []),
        (supabase as any).from("finance_payouts").select("amount, status, created_at").then((r: any) => r.data ?? []),
        fetchAllRows<any>("influencer_referrals", "commission_earned, created_at"),
      ]);

      const paidOrders = orders.filter((o: any) => PAID.includes(String(o.status).toLowerCase()));
      const gross = paidOrders.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
      const refundedAmount = (refunds as any[]).filter((r) => r.status === "processed").reduce((s, r) => s + Number(r.amount || 0), 0);
      const payoutsPaid = (payouts as any[]).filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
      const commission = (referrals as any[]).reduce((s, r) => s + Number(r.commission_earned || 0), 0);
      const taxRate = 0.075;
      const vatEstimate = gross * taxRate / (1 + taxRate);
      const netRevenue = gross - refundedAmount;

      const now = new Date();
      const monthly = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
        const rev = paidOrders.filter((o: any) => { const od = new Date(o.created_at); return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear(); }).reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
        const ref = (refunds as any[]).filter((r) => r.status === "processed" && (() => { const rd = new Date(r.created_at); return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear(); })()).reduce((s, r) => s + Number(r.amount || 0), 0);
        return { month: label, revenue: rev, refunds: ref };
      });

      const courseMap = new Map(courses.map((c: any) => [c.id, c.title]));
      const perCourse: Record<string, number> = {};
      paidOrders.forEach((o: any) => { if (!o.course_id) return; perCourse[o.course_id] = (perCourse[o.course_id] ?? 0) + Number(o.amount || 0); });
      const topCourses = Object.entries(perCourse).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, rev]) => ({ id, title: courseMap.get(id) ?? id.slice(0, 8), revenue: rev }));

      return { gross, netRevenue, refundedAmount, payoutsPaid, commission, vatEstimate, monthly, topCourses };
    },
  });

  if (isLoading || !data) return <div className="py-12 text-center text-sm text-muted-foreground">Loading ledger...</div>;

  const kpis = [
    { label: "Gross revenue", value: data.gross, icon: DollarSign, color: "text-green-500" },
    { label: "Net revenue", value: data.netRevenue, icon: TrendingUp, color: "text-primary" },
    { label: "Refunds processed", value: data.refundedAmount, icon: ArrowDownRight, color: "text-red-400" },
    { label: "VAT (est. 7.5%)", value: data.vatEstimate, icon: Receipt, color: "text-amber-500" },
    { label: "Influencer commission", value: data.commission, icon: BadgePercent, color: "text-purple-500" },
    { label: "Payouts paid", value: data.payoutsPaid, icon: Wallet, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Revenue ledger</h2>
          <p className="text-xs text-muted-foreground">Paid orders, refunds, commission and payouts.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          downloadCSV("finance-monthly.csv", ["Month", "Revenue", "Refunds"], data.monthly.map((m: any) => [m.month, String(m.revenue), String(m.refunds)]));
          toast({ title: "Exported", description: "Monthly CSV downloaded." });
        }}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-card border border-border rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center mb-2 ${k.color}`}>
              <k.icon className="h-4 w-4" />
            </div>
            <p className="font-heading text-lg font-bold">{format(k.value)}</p>
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-3">Revenue vs refunds (12 months)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => format(Number(v))} contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" fill="hsl(142, 71%, 45%)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="refunds" fill="hsl(0, 84%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-3">Top courses by revenue</h3>
        {data.topCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No paid orders yet.</p>
        ) : (
          <div className="space-y-2">
            {data.topCourses.map((c: any, i: number) => (
              <div key={c.id} className="flex items-center justify-between border-b border-border/50 last:border-0 py-2 text-sm">
                <span className="font-medium truncate">{i + 1}. {c.title}</span>
                <span className="font-mono">{format(c.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}