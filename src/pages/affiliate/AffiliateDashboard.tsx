import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Copy, MousePointerClick, Users, Wallet, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/format-currency";

export default function AffiliateDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-self", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // RLS scopes every query below to this affiliate only.
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!affiliate) return { affiliate: null, clicks: 0, referrals: [], payouts: [] };
      const [{ count }, { data: referrals }, { data: payouts }] = await Promise.all([
        supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }).eq("affiliate_id", (affiliate as any).id),
        supabase.from("affiliate_referrals").select("*").eq("affiliate_id", (affiliate as any).id).order("created_at", { ascending: false }),
        supabase.from("affiliate_payouts").select("*").eq("affiliate_id", (affiliate as any).id).order("created_at", { ascending: false }),
      ]);
      return { affiliate, clicks: count ?? 0, referrals: referrals ?? [], payouts: payouts ?? [] };
    },
  });

  const affiliate: any = data?.affiliate;
  const referrals: any[] = data?.referrals ?? [];
  const payouts: any[] = data?.payouts ?? [];
  const earned = referrals.reduce((s, r) => s + Number(r.commission ?? 0), 0);
  const paid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const link = affiliate ? `https://siliconedgec.com/?ref=${affiliate.code}` : "";

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast({ title: "Referral link copied" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Affiliate Dashboard | Silicon Edge Consulting" description="Track your referral clicks, conversions and commission payouts." />
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-28 pb-16 space-y-6">
        {authLoading || isLoading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !user ? (
          <Card className="max-w-lg mx-auto text-center p-10 space-y-4">
            <h1 className="font-heading text-xl font-bold">Sign in to view your affiliate dashboard</h1>
            <Button asChild><Link to="/sign-in">Sign in</Link></Button>
          </Card>
        ) : !affiliate ? (
          <Card className="max-w-lg mx-auto text-center p-10 space-y-4">
            <h1 className="font-heading text-xl font-bold">No affiliate account yet</h1>
            <p className="text-sm text-muted-foreground">Apply to the partner program to get your referral link and dashboard.</p>
            <Button asChild><Link to="/affiliates">Apply now</Link></Button>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-heading text-3xl font-bold">Affiliate dashboard</h1>
                <p className="text-sm text-muted-foreground">{affiliate.full_name} · {affiliate.commission_percentage}% commission</p>
              </div>
              <Badge variant={affiliate.status === "approved" ? "default" : "secondary"} className="capitalize">{affiliate.status}</Badge>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Your referral link</CardTitle></CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-2">
                <Input readOnly value={link} />
                <Button onClick={copy} variant="outline" className="gap-2"><Copy className="h-4 w-4" /> Copy</Button>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: MousePointerClick, label: "Clicks", value: String(data?.clicks ?? 0) },
                { icon: Users, label: "Referrals", value: String(referrals.length) },
                { icon: TrendingUp, label: "Commission earned", value: formatNaira(earned) },
                { icon: Wallet, label: "Paid out", value: formatNaira(paid) },
              ].map(({ icon: Icon, label, value }) => (
                <Card key={label}>
                  <CardContent className="p-5 space-y-1">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-heading text-2xl font-bold">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Your referrals</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {referrals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No referrals recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Order value</TableHead><TableHead>Commission</TableHead><TableHead>Status</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="capitalize">{String(r.conversion_type).replace(/_/g, " ")}</TableCell>
                          <TableCell>{formatNaira(Number(r.amount ?? 0))}</TableCell>
                          <TableCell>{formatNaira(Number(r.commission ?? 0))}</TableCell>
                          <TableCell><Badge variant="secondary" className="capitalize">{r.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Payouts</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {payouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No payouts yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Reference</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{new Date(p.paid_at ?? p.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{formatNaira(Number(p.amount ?? 0))}</TableCell>
                          <TableCell><Badge variant="secondary" className="capitalize">{p.status}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{p.reference ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}