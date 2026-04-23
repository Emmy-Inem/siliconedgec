import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Shield, Search, Loader2, AlertTriangle, CheckCircle2, XCircle, Lock, Globe,
  Download, TrendingUp, Activity, Clock, ShieldAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Range = "1d" | "7d" | "30d" | "all";
const RANGE_DAYS: Record<Range, number> = { "1d": 1, "7d": 7, "30d": 30, "all": 9999 };

export default function AdminLoginSecurity() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "failed" | "success">("failed");
  const [range, setRange] = useState<Range>("7d");

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["admin-login-attempts"],
    queryFn: async () => (await supabase.from("login_attempts").select("*").order("created_at", { ascending: false }).limit(2000)).data ?? [],
    refetchInterval: 30_000,
  });

  // Filter window
  const windowed = useMemo(() => {
    const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
    return attempts.filter((a: any) => +new Date(a.created_at) >= cutoff);
  }, [attempts, range]);

  const filtered = useMemo(() => {
    return windowed.filter((a: any) => {
      if (statusFilter === "failed" && a.success) return false;
      if (statusFilter === "success" && !a.success) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!((a.email ?? "").toLowerCase().includes(q) || (a.ip_address ?? "").includes(q) || (a.user_agent ?? "").toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [windowed, statusFilter, search]);

  // Locked accounts (≥5 failures in last 15 minutes)
  const lockedAccounts = useMemo(() => {
    const cutoff = Date.now() - 15 * 60_000;
    const byEmail: Record<string, number> = {};
    attempts.forEach((a: any) => {
      if (a.success || +new Date(a.created_at) < cutoff) return;
      const k = a.email ?? a.ip_address ?? "unknown";
      byEmail[k] = (byEmail[k] ?? 0) + 1;
    });
    return Object.entries(byEmail).filter(([, c]) => c >= 5).sort((a, b) => b[1] - a[1]);
  }, [attempts]);

  // Top offending IPs in window
  const topIps = useMemo(() => {
    const map: Record<string, { fails: number; ok: number; lastSeen: string; emails: Set<string> }> = {};
    windowed.forEach((a: any) => {
      const ip = a.ip_address ?? "unknown";
      if (!map[ip]) map[ip] = { fails: 0, ok: 0, lastSeen: a.created_at, emails: new Set() };
      if (a.success) map[ip].ok += 1; else map[ip].fails += 1;
      if (+new Date(a.created_at) > +new Date(map[ip].lastSeen)) map[ip].lastSeen = a.created_at;
      if (a.email) map[ip].emails.add(a.email);
    });
    return Object.entries(map)
      .map(([ip, v]) => ({ ip, ...v, accounts: v.emails.size }))
      .sort((a, b) => b.fails - a.fails)
      .slice(0, 12);
  }, [windowed]);

  // Hour-by-hour series for last 24h
  const series = useMemo(() => {
    const buckets: Array<{ label: string; fails: number; ok: number }> = [];
    const now = Date.now();
    for (let i = 23; i >= 0; i--) {
      const start = now - (i + 1) * 3_600_000;
      const end = now - i * 3_600_000;
      const slice = attempts.filter((a: any) => {
        const t = +new Date(a.created_at);
        return t >= start && t < end;
      });
      const d = new Date(end);
      buckets.push({
        label: `${d.getHours().toString().padStart(2, "0")}:00`,
        fails: slice.filter((a: any) => !a.success).length,
        ok: slice.filter((a: any) => a.success).length,
      });
    }
    return buckets;
  }, [attempts]);

  const peakBucket = Math.max(1, ...series.map((s) => s.fails + s.ok));

  const stats = {
    total: windowed.length,
    failed: windowed.filter((a: any) => !a.success).length,
    locked: lockedAccounts.length,
    successful: windowed.filter((a: any) => a.success).length,
    uniqueIps: new Set(windowed.map((a: any) => a.ip_address)).size,
    failureRate: windowed.length ? Math.round((windowed.filter((a: any) => !a.success).length / windowed.length) * 100) : 0,
  };

  const exportCsv = () => {
    const header = ["When", "Status", "Email", "IP", "User Agent"];
    const lines = filtered.map((a: any) => [
      new Date(a.created_at).toISOString(),
      a.success ? "ok" : "fail",
      a.email ?? "",
      a.ip_address ?? "",
      a.user_agent ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `login-security-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Login Security</h1>
            <p className="text-sm text-muted-foreground">Failed sign-ins, locked accounts, IP intelligence — auto-refreshes every 30s</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={CheckCircle2} label="Successful" value={stats.successful} />
        <Stat icon={XCircle} label="Failed" value={stats.failed} accent="text-destructive" />
        <Stat icon={TrendingUp} label="Failure rate" value={`${stats.failureRate}%`} accent={stats.failureRate > 30 ? "text-destructive" : "text-amber-500"} />
        <Stat icon={Lock} label="Locked now" value={stats.locked} accent="text-amber-500" />
        <Stat icon={Globe} label="Unique IPs" value={stats.uniqueIps} />
        <Stat icon={Activity} label="Total" value={stats.total} />
      </div>

      {lockedAccounts.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Active lockouts ({lockedAccounts.length}) — ≥5 failures in 15 min
            </p>
            <div className="flex flex-wrap gap-2">
              {lockedAccounts.map(([k, c]) => (
                <Badge key={k} variant="outline" className="border-amber-500/40 text-xs">
                  <Lock className="h-3 w-3 mr-1" /> {k} · {c} attempts
                </Badge>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Lockouts auto-clear after 15 minutes of inactivity.</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline" className="gap-2"><Clock className="h-4 w-4" />Timeline (24h)</TabsTrigger>
          <TabsTrigger value="ips" className="gap-2"><Globe className="h-4 w-4" />Top IPs</TabsTrigger>
          <TabsTrigger value="raw" className="gap-2"><Activity className="h-4 w-4" />Attempts</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-end gap-1 h-44">
                {series.map((b, i) => {
                  const fh = (b.fails / peakBucket) * 100;
                  const oh = (b.ok / peakBucket) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col-reverse items-center gap-0.5 group" title={`${b.label} — ok: ${b.ok}, fail: ${b.fails}`}>
                      <span className="text-[9px] text-muted-foreground hidden md:block">{i % 4 === 0 ? b.label : ""}</span>
                      <div className="w-full bg-primary/70 rounded-t transition-all group-hover:bg-primary" style={{ height: `${oh}%` }} />
                      <div className="w-full bg-destructive/80 rounded-t transition-all group-hover:bg-destructive" style={{ height: `${fh}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-primary rounded-sm" /> Successful</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-destructive rounded-sm" /> Failed</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ips">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {topIps.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">No IP activity in this window.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Successful</TableHead>
                      <TableHead className="text-right">Accounts targeted</TableHead>
                      <TableHead>Last seen</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topIps.map((row) => {
                      const risk = row.fails >= 10 ? "high" : row.fails >= 3 ? "med" : "low";
                      return (
                        <TableRow key={row.ip}>
                          <TableCell className="font-mono text-xs">{row.ip}</TableCell>
                          <TableCell className="text-right text-destructive font-medium">{row.fails}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{row.ok}</TableCell>
                          <TableCell className="text-right">{row.accounts}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(row.lastSeen).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={risk === "high" ? "destructive" : risk === "med" ? "secondary" : "outline"} className="text-[10px] capitalize">{risk}</Badge>
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

        <TabsContent value="raw" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by email, IP, or user-agent..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All attempts</SelectItem>
                <SelectItem value="failed">Failed only</SelectItem>
                <SelectItem value="success">Successful only</SelectItem>
              </SelectContent>
            </Select>
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
                    {filtered.slice(0, 300).map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Badge variant={a.success ? "default" : "destructive"} className="text-[10px]">
                            {a.success ? "OK" : "FAIL"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{a.email ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{a.ip_address ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">{a.user_agent ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {filtered.length > 300 && (
                <p className="p-3 text-center text-xs text-muted-foreground border-t">Showing 300 of {filtered.length}. Refine filters to narrow down.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent = "text-primary" }: { icon: any; label: string; value: number | string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-heading text-lg font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
