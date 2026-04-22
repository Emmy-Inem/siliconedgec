import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Receipt, Search, Loader2, Download, DollarSign, ShoppingBag, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/format-currency";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30d");
  const [refundTarget, setRefundTarget] = useState<any | null>(null);
  const [refunding, setRefunding] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-orders-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, title")).data ?? [],
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-orders-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("user_id, full_name")).data ?? [],
  });

  const courseTitle = (id: string) => courses.find((c: any) => c.id === id)?.title ?? "—";
  const profileName = (id: string) => profiles.find((p: any) => p.user_id === id)?.full_name ?? "Guest";

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Order updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-refund", {
        body: { order_id: refundTarget.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Refund processed", description: data?.already ? "Order was already refunded." : "Paystack confirmed the refund." });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      setRefundTarget(null);
    } catch (e: any) {
      toast({ title: "Refund failed", description: e?.message ?? "Could not process refund", variant: "destructive" });
    } finally {
      setRefunding(false);
    }
  };

  const filtered = useMemo(() => {
    const ranges: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const now = Date.now();
    return orders.filter((o: any) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (dateRange !== "all") {
        const d = ranges[dateRange] ?? 0;
        if (now - +new Date(o.created_at) > d * 86400000) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          (o.reference || "").toLowerCase().includes(q) ||
          (o.paystack_reference || "").toLowerCase().includes(q) ||
          courseTitle(o.course_id).toLowerCase().includes(q) ||
          profileName(o.user_id).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, dateRange, search, courses, profiles]);

  const stats = useMemo(() => {
    const paid = filtered.filter((o: any) => o.status === "paid" || o.status === "success");
    const refunded = filtered.filter((o: any) => o.status === "refunded");
    const totalRevenue = paid.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
    return { count: filtered.length, paid: paid.length, refunded: refunded.length, totalRevenue };
  }, [filtered]);

  const exportCsv = () => {
    const header = ["Reference", "Paystack Ref", "Customer", "Course", "Amount", "Currency", "Discount", "Status", "Created"];
    const lines = filtered.map((o: any) => [
      o.reference, o.paystack_reference ?? "", profileName(o.user_id), courseTitle(o.course_id),
      o.amount, o.currency, o.discount_amount ?? 0, o.status, new Date(o.created_at).toISOString(),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Receipt className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Orders & Payments</h1>
            <p className="text-sm text-muted-foreground">All checkout transactions, refunds, and revenue tracking</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ShoppingBag} label="Orders" value={String(stats.count)} />
        <StatCard icon={CheckCircle2} label="Paid" value={String(stats.paid)} />
        <StatCard icon={RefreshCw} label="Refunded" value={String(stats.refunded)} />
        <StatCard icon={DollarSign} label="Revenue" value={formatNaira(stats.totalRevenue)} />
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by reference, customer, or course..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No orders match your filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.reference}</TableCell>
                    <TableCell className="text-sm">{profileName(o.user_id)}</TableCell>
                    <TableCell className="text-sm max-w-[220px] truncate">{courseTitle(o.course_id)}</TableCell>
                    <TableCell className="font-medium">{formatNaira(Number(o.amount || 0))}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "paid" || o.status === "success" ? "default" : o.status === "refunded" ? "destructive" : "secondary"} className="capitalize text-[10px]">
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {(o.status === "paid" || o.status === "success") ? (
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRefundTarget(o)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Refund
                        </Button>
                      ) : o.status === "refunded" ? (
                        <Badge variant="outline" className="text-[10px]">Refunded</Badge>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: o.id, status: "paid" })}>
                          Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!refundTarget} onOpenChange={(o) => !o && setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund this order?</AlertDialogTitle>
            <AlertDialogDescription>
              {refundTarget && (
                <>
                  This will call Paystack to refund <strong>{formatNaira(Number(refundTarget.amount || 0))}</strong> for order
                  {" "}<span className="font-mono">{refundTarget.reference}</span> and remove the student's enrollment.
                  This action cannot be undone from the admin.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refunding}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleRefund(); }} disabled={refunding} className="bg-destructive hover:bg-destructive/90">
              {refunding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-heading text-lg font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}