import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Receipt, Search, Loader2, Download, DollarSign, ShoppingBag, RefreshCw, CheckCircle2, XCircle,
  ShoppingCart, Package, ShieldCheck, History, ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/format-currency";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";

type CheckoutKind = "cart" | "single";
const checkoutKindFor = (ref: string): CheckoutKind => (ref?.startsWith("cart-") ? "cart" : "single");

export default function AdminOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [checkoutFilter, setCheckoutFilter] = useState("all");
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

  const { data: orderReferrals = [] } = useQuery({
    queryKey: ["admin-orders-referrals"],
    queryFn: async () => {
      const { data } = await (supabase.from("influencer_referrals") as any)
        .select("order_id, utm_source, utm_campaign, promo_codes(code, influencer_name)");
      return data ?? [];
    },
  });

  // Audit trail — verify + refund events from admin_activity_log
  const { data: auditLog = [], isLoading: auditLoading } = useQuery({
    queryKey: ["admin-orders-audit"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_activity_log")
        .select("*")
        .eq("entity_type", "order")
        .in("action", ["verify", "refund"])
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const courseTitle = (id: string) => courses.find((c: any) => c.id === id)?.title ?? "—";
  const profileName = (id: string) => profiles.find((p: any) => p.user_id === id)?.full_name ?? "Guest";
  const referralFor = (orderId: string) => orderReferrals.find((r: any) => r.order_id === orderId);

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
      qc.invalidateQueries({ queryKey: ["admin-orders-audit"] });
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
      if (checkoutFilter !== "all" && checkoutKindFor(o.reference) !== checkoutFilter) return false;
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
  }, [orders, statusFilter, checkoutFilter, dateRange, search, courses, profiles]);

  const stats = useMemo(() => {
    const paid = filtered.filter((o: any) => ["paid", "success", "completed"].includes(o.status));
    const refunded = filtered.filter((o: any) => o.status === "refunded");
    const cartOrders = filtered.filter((o: any) => checkoutKindFor(o.reference) === "cart");
    const totalRevenue = paid.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
    return { count: filtered.length, paid: paid.length, refunded: refunded.length, totalRevenue, cart: cartOrders.length };
  }, [filtered]);

  const exportCsv = () => {
    const header = ["Reference", "Paystack Ref", "Checkout", "Customer", "Course", "Amount", "Currency", "Discount", "Status", "Created"];
    const lines = filtered.map((o: any) => [
      o.reference, o.paystack_reference ?? "", checkoutKindFor(o.reference), profileName(o.user_id), courseTitle(o.course_id),
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

  const exportAuditCsv = () => {
    const header = ["When", "Action", "Order ID", "Reference", "Checkout", "Amount", "Actor", "Gateway Response"];
    const lines = auditLog.map((a: any) => {
      const d = a.details ?? {};
      return [
        new Date(a.created_at).toISOString(),
        a.action,
        a.entity_id ?? "",
        d.reference ?? d.cart_reference ?? d.paystack_reference ?? "",
        d.checkout_type ?? "",
        d.amount ?? d.cart_total ?? "",
        profileName(a.admin_user_id),
        d.gateway_response ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-audit-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <p className="text-sm text-muted-foreground">Checkout transactions, refunds, audit trail</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={ShoppingBag} label="Orders" value={String(stats.count)} />
        <StatCard icon={CheckCircle2} label="Paid" value={String(stats.paid)} />
        <StatCard icon={ShoppingCart} label="Cart Checkouts" value={String(stats.cart)} />
        <StatCard icon={RefreshCw} label="Refunded" value={String(stats.refunded)} />
        <StatCard icon={DollarSign} label="Revenue" value={formatNaira(stats.totalRevenue)} />
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2"><Package className="h-4 w-4" />Orders</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><History className="h-4 w-4" />Audit Trail
            {auditLog.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{auditLog.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_160px]">
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
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={checkoutFilter} onValueChange={setCheckoutFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any checkout</SelectItem>
                <SelectItem value="cart">Cart checkout</SelectItem>
                <SelectItem value="single">Single course</SelectItem>
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
                      <TableHead>Checkout</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((o: any) => {
                      const kind = checkoutKindFor(o.reference);
                      const attr: any = referralFor(o.id);
                      return (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">
                            <Link to={`/verify-receipt/${encodeURIComponent(o.reference)}`} className="hover:text-primary inline-flex items-center gap-1">
                              {o.reference}
                              <ExternalLink className="h-3 w-3 opacity-50" />
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant={kind === "cart" ? "default" : "outline"} className="gap-1 text-[10px]">
                              {kind === "cart" ? <ShoppingCart className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                              {kind === "cart" ? "Cart" : "Single"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{profileName(o.user_id)}</TableCell>
                          <TableCell className="text-sm max-w-[220px] truncate">{courseTitle(o.course_id)}</TableCell>
                          <TableCell className="font-medium">{formatNaira(Number(o.amount || 0))}</TableCell>
                          <TableCell>
                            {attr ? (
                              <div className="text-xs">
                                <div className="font-medium text-primary">
                                  {attr.promo_codes?.influencer_name ?? attr.utm_source ?? "UTM"}
                                </div>
                                {attr.promo_codes?.code && (
                                  <div className="text-[10px] text-muted-foreground font-mono">{attr.promo_codes.code}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Direct</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={["paid", "success", "completed"].includes(o.status) ? "default" : o.status === "refunded" ? "destructive" : "secondary"} className="capitalize text-[10px]">
                              {o.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {["paid", "success", "completed"].includes(o.status) ? (
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
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Every payment verification and refund is permanently recorded here.
            </p>
            <Button variant="outline" size="sm" onClick={exportAuditCsv}><Download className="h-4 w-4 mr-2" />Export</Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {auditLoading ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
              ) : auditLog.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">No audit events yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Checkout</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Gateway</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map((a: any) => {
                      const d = a.details ?? {};
                      const ref = d.reference ?? d.cart_reference ?? d.paystack_reference ?? "—";
                      const amt = Number(d.amount ?? d.cart_total ?? 0);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={a.action === "refund" ? "destructive" : "default"} className="capitalize text-[10px]">{a.action}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {ref !== "—" ? (
                              <Link to={`/verify-receipt/${encodeURIComponent(ref)}`} className="hover:text-primary inline-flex items-center gap-1">
                                {ref}<ExternalLink className="h-3 w-3 opacity-50" />
                              </Link>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {d.checkout_type && (
                              <Badge variant="outline" className="capitalize text-[10px]">{d.checkout_type}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-sm">{amt ? formatNaira(amt) : "—"}</TableCell>
                          <TableCell className="text-sm">{profileName(a.admin_user_id)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">{d.gateway_response ?? "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
