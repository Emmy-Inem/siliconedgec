import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2, Shield } from "lucide-react";

export default function AdminBlockedIps() {
  const qc = useQueryClient();
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["blocked_ips"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blocked_ips" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("blocked_ips" as any).insert({ ip_address: ip.trim(), reason: reason.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      setIp(""); setReason("");
      toast({ title: "IP blocked" });
      qc.invalidateQueries({ queryKey: ["blocked_ips"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_ips" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocked_ips"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Blocked IPs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="IP address" value={ip} onChange={(e) => setIp(e.target.value)} className="w-48" />
          <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="flex-1 min-w-48" />
          <Button onClick={() => addMut.mutate()} disabled={!ip.trim() || addMut.isPending}>Block IP</Button>
        </div>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No blocked IPs.</p>
        ) : (
          <div className="space-y-2">
            {data.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-mono font-medium">{b.ip_address}</div>
                  {b.reason && <div className="text-xs text-muted-foreground">{b.reason}</div>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => delMut.mutate(b.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}