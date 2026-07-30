import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/format-currency";

export default function AdminAffiliates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [payoutFor, setPayoutFor] = useState<any | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const [{ data: affiliates }, { data: referrals }, { data: payouts }, { data: clicks }] = await Promise.all([
        supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
        supabase.from("affiliate_referrals").select("affiliate_id, amount, commission, status"),
        supabase.from("affiliate_payouts").select("affiliate_id, amount, status"),
        supabase.from("affiliate_clicks").select("affiliate_id"),
      ]);
      return { affiliates: affiliates ?? [], referrals: referrals ?? [], payouts: payouts ?? [], clicks: clicks ?? [] };
    },
  });

  const statFor = (id: string) => {
    const refs = (data?.referrals ?? []).filter((r: any) => r.affiliate_id === id);
    return {
      clicks: (data?.clicks ?? []).filter((c: any) => c.affiliate_id === id).length,
      referrals: refs.length,
      earned: refs.reduce((s: number, r: any) => s + Number(r.commission ?? 0), 0),
      paid: (data?.payouts ?? [])
        .filter((p: any) => p.affiliate_id === id && p.status === "paid")
        .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0),
    };
  };

  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("affiliates").update(patch as any).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
    toast({ title: "Affiliate updated" });
  };

  const recordPayout = async () => {
    if (!payoutFor || !Number(payoutAmount)) return;
    setSaving(true);
    const { error } = await supabase.from("affiliate_payouts").insert({
      affiliate_id: payoutFor.id,
      amount: Number(payoutAmount),
      reference: payoutRef || null,
      status: "paid",
      paid_at: new Date().toISOString(),
    } as any);
    setSaving(false);
    if (error) return toast({ title: "Payout failed", description: error.message, variant: "destructive" });
    setPayoutFor(null);
    setPayoutAmount("");
    setPayoutRef("");
    qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
    toast({ title: "Payout recorded" });
  };

  const rows = (data?.affiliates ?? []).filter((a: any) =>
    !q.trim() ? true : `${a.full_name} ${a.email} ${a.code}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Affiliates</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name, email or code" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No affiliates yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead><TableHead>Code</TableHead><TableHead>Rate</TableHead>
                  <TableHead>Clicks</TableHead><TableHead>Referrals</TableHead><TableHead>Earned</TableHead>
                  <TableHead>Paid</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a: any) => {
                  const s = statFor(a.id);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.full_name}</div>
                        <div className="text-xs text-muted-foreground">{a.email}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{a.code}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20 h-8"
                          defaultValue={a.commission_percentage}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== Number(a.commission_percentage)) update(a.id, { commission_percentage: v });
                          }}
                        />
                      </TableCell>
                      <TableCell>{s.clicks}</TableCell>
                      <TableCell>{s.referrals}</TableCell>
                      <TableCell>{formatNaira(s.earned)}</TableCell>
                      <TableCell>{formatNaira(s.paid)}</TableCell>
                      <TableCell>
                        <Select value={a.status} onValueChange={(v) => update(a.id, { status: v })}>
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setPayoutFor(a)}>
                          <Wallet className="h-3.5 w-3.5" /> Payout
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!payoutFor} onOpenChange={(o) => !o && setPayoutFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payout — {payoutFor?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="po-amount">Amount (₦)</Label>
              <Input id="po-amount" type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-ref">Reference (optional)</Label>
              <Input id="po-ref" value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} />
            </div>
            {payoutFor?.payout_details && (
              <p className="text-xs text-muted-foreground">Payout details: {payoutFor.payout_details}</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={recordPayout} disabled={saving || !Number(payoutAmount)}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}