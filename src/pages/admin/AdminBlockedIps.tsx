import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2, Shield } from "lucide-react";

const DURATION_OPTIONS = [
  { value: "permanent", label: "Permanent" },
  { value: "1", label: "1 hour" },
  { value: "24", label: "24 hours" },
  { value: "168", label: "7 days" },
  { value: "720", label: "30 days" },
];

export default function AdminBlockedIps() {
  const qc = useQueryClient();
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("permanent");

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
      const { data: auth } = await supabase.auth.getUser();
      const expires_at = duration === "permanent"
        ? null
        : new Date(Date.now() + Number(duration) * 3600_000).toISOString();
      const { error } = await supabase.from("blocked_ips" as any).insert({
        ip_address: ip.trim(),
        reason: reason.trim() || null,
        expires_at,
        blocked_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setIp(""); setReason(""); setDuration("permanent");
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
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => addMut.mutate()} disabled={!ip.trim() || addMut.isPending}>Block IP</Button>
        </div>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No blocked IPs.</p>
        ) : (
          <div className="space-y-2">
            {data.map((b) => {
              const expired = b.expires_at && new Date(b.expires_at) <= new Date();
              return (
                <div key={b.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-mono font-medium flex items-center gap-2">
                      {b.ip_address}
                      {expired ? (
                        <Badge variant="outline" className="text-[10px]">Expired</Badge>
                      ) : b.expires_at ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Until {new Date(b.expires_at).toLocaleString()}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Permanent</Badge>
                      )}
                    </div>
                    {b.reason && <div className="text-xs text-muted-foreground">{b.reason}</div>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => delMut.mutate(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}