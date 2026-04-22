import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Shield, Search, Loader2, AlertTriangle, CheckCircle2, XCircle, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminLoginSecurity() {
  const [search, setSearch] = useState("");
  const [showFailedOnly, setShowFailedOnly] = useState(true);

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["admin-login-attempts"],
    queryFn: async () => (await supabase.from("login_attempts").select("*").order("created_at", { ascending: false }).limit(1000)).data ?? [],
  });

  const filtered = useMemo(() => {
    return attempts.filter((a: any) => {
      if (showFailedOnly && a.success) return false;
      if (search && !((a.email ?? "").toLowerCase().includes(search.toLowerCase()) || (a.ip_address ?? "").includes(search))) return false;
      return true;
    });
  }, [attempts, showFailedOnly, search]);

  const lockedAccounts = useMemo(() => {
    const cutoff = Date.now() - 15 * 60_000;
    const byEmail: Record<string, number> = {};
    attempts.forEach((a: any) => {
      if (a.success || +new Date(a.created_at) < cutoff) return;
      const k = a.email ?? a.ip_address ?? "unknown";
      byEmail[k] = (byEmail[k] ?? 0) + 1;
    });
    return Object.entries(byEmail).filter(([, c]) => c >= 5);
  }, [attempts]);

  const stats = {
    total: attempts.length,
    failed: attempts.filter((a: any) => !a.success).length,
    locked: lockedAccounts.length,
    successful: attempts.filter((a: any) => a.success).length,
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Login Security</h1>
          <p className="text-sm text-muted-foreground">Failed sign-ins, locked accounts, and IP activity</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={CheckCircle2} label="Successful" value={stats.successful} />
        <Stat icon={XCircle} label="Failed" value={stats.failed} accent="text-destructive" />
        <Stat icon={Lock} label="Currently Locked" value={stats.locked} accent="text-amber-500" />
        <Stat icon={AlertTriangle} label="Total Attempts" value={stats.total} />
      </div>

      {lockedAccounts.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4" /> Locked accounts (≥5 failures in 15 min)
            </p>
            <div className="flex flex-wrap gap-2">
              {lockedAccounts.map(([k, c]) => (
                <Badge key={k} variant="outline" className="text-xs">{k} · {c} attempts</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-[1fr_auto] items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by email or IP..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showFailedOnly} onChange={(e) => setShowFailedOnly(e.target.checked)} className="rounded" />
          Failed only
        </label>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No attempts match.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>User Agent</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant={a.success ? "default" : "destructive"} className="text-[10px]">
                        {a.success ? "OK" : "FAIL"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{a.email ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{a.ip_address ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">{a.user_agent ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent = "text-primary" }: { icon: any; label: string; value: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-heading text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}