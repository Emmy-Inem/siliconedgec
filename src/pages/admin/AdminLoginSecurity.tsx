import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Shield, Search, Loader2, AlertTriangle, CheckCircle2, XCircle, Lock, Globe,
  Download, TrendingUp, Activity, Clock, ShieldAlert, Ban, Trash2, Plus, KeyRound,
  Unlock, ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { logAdminActivity } from "@/lib/admin-logger";
import { Switch } from "@/components/ui/switch";
import { PUBLIC_ACCESS_KEY, usePublicAccessMode } from "@/hooks/usePublicAccessMode";
import { Eye } from "lucide-react";

type Range = "1d" | "7d" | "30d" | "all";
const RANGE_DAYS: Record<Range, number> = { "1d": 1, "7d": 7, "30d": 30, "all": 9999 };

export default function AdminLoginSecurity() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: publicAccess = false } = usePublicAccessMode();

  const togglePublicAccess = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("key", PUBLIC_ACCESS_KEY)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("site_content")
          .update({ value: enabled ? "true" : "false" })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_content")
          .insert({ key: PUBLIC_ACCESS_KEY, value: enabled ? "true" : "false", content_type: "setting" });
        if (error) throw error;
      }
      await logAdminActivity(enabled ? "enable_public_access" : "disable_public_access", "security");
    },
    onSuccess: (_, enabled) => {
      qc.invalidateQueries({ queryKey: ["public-access-mode"] });
      toast({
        title: enabled ? "Public access ON" : "Public access OFF",
        description: enabled
          ? "Visitors can now browse Dashboard and course pages without signing in."
          : "Sign-in is required again for protected pages.",
      });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "failed" | "success">("failed");
  const [range, setRange] = useState<Range>("7d");
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ ip_address: "", reason: "", expires_in_hours: "" });

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["admin-login-attempts"],
    queryFn: async () => (await supabase.from("login_attempts").select("*").order("created_at", { ascending: false }).limit(2000)).data ?? [],
    refetchInterval: 30_000,
  });

  const { data: blockedIps = [] } = useQuery({
    queryKey: ["admin-blocked-ips"],
    queryFn: async () => (await (supabase.from as any)("blocked_ips").select("*").order("created_at", { ascending: false })).data ?? [],
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
    const byKey: Record<string, { count: number; ip: string | null; email: string | null }> = {};
    attempts.forEach((a: any) => {
      if (a.success || +new Date(a.created_at) < cutoff) return;
      const k = a.email ?? a.ip_address ?? "unknown";
      if (!byKey[k]) byKey[k] = { count: 0, ip: a.ip_address, email: a.email };
      byKey[k].count += 1;
    });
    return Object.entries(byKey).filter(([, v]) => v.count >= 5).sort((a, b) => b[1].count - a[1].count);
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
    blockedIpsCount: blockedIps.length,
  };

  const clearLockout = useMutation({
    mutationFn: async (key: string) => {
      const { data, error } = await (supabase.rpc as any)("clear_login_lockout", { _key: key });
      if (error) throw error;
      await logAdminActivity("clear_lockout", "security", undefined, { key, removed_attempts: data });
      return data;
    },
    onSuccess: (data, key) => {
      qc.invalidateQueries({ queryKey: ["admin-login-attempts"] });
      toast({ title: "Lockout cleared", description: `Removed ${data} failed attempts for ${key}` });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const addBlock = useMutation({
    mutationFn: async () => {
      const { ip_address, reason, expires_in_hours } = blockForm;
      if (!ip_address.trim()) throw new Error("IP address required");
      const expires_at = expires_in_hours
        ? new Date(Date.now() + Number(expires_in_hours) * 3_600_000).toISOString()
        : null;
      const { error } = await (supabase.from as any)("blocked_ips").insert({
        ip_address: ip_address.trim(),
        reason: reason.trim() || null,
        blocked_by: user?.id ?? null,
        expires_at,
      });
      if (error) throw error;
      await logAdminActivity("block_ip", "security", undefined, { ip: ip_address.trim(), reason, expires_at });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blocked-ips"] });
      setBlockOpen(false);
      setBlockForm({ ip_address: "", reason: "", expires_in_hours: "" });
      toast({ title: "IP blocked", description: "All future requests from this IP will be denied at the function layer." });
    },
    onError: (e: any) => toast({ title: "Block failed", description: e.message, variant: "destructive" }),
  });

  const removeBlock = useMutation({
    mutationFn: async (id: string) => {
      const block = blockedIps.find((b: any) => b.id === id);
      const { error } = await (supabase.from as any)("blocked_ips").delete().eq("id", id);
      if (error) throw error;
      await logAdminActivity("unblock_ip", "security", undefined, { ip: block?.ip_address });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blocked-ips"] });
      toast({ title: "Block removed" });
    },
  });

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

      {/* Hardening status banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <KeyRound className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Hardening status</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Auto-lockout after 5 failed attempts in 15 min</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Leaked password protection (HIBP) enabled</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Role-based access control with audit log</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Manual IP blocklist with expiry support</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Email signups require verification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Public Access Mode toggle — lets visitors browse without signing in */}
      <Card className={publicAccess ? "border-amber-500/40 bg-amber-500/5" : "border-border"}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Eye className={`h-5 w-5 mt-0.5 ${publicAccess ? "text-amber-500" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    Public Access Mode
                    {publicAccess && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">ACTIVE</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When ON, visitors can view Dashboard and course pages without signing in. Admin area always stays protected. Checkout still requires sign-in.
                  </p>
                </div>
                <Switch
                  checked={publicAccess}
                  disabled={togglePublicAccess.isPending}
                  onCheckedChange={(v) => togglePublicAccess.mutate(v)}
                />
              </div>
              {publicAccess && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" /> Remember to turn this OFF when public testing is done.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <Stat icon={CheckCircle2} label="Successful" value={stats.successful} />
        <Stat icon={XCircle} label="Failed" value={stats.failed} accent="text-destructive" />
        <Stat icon={TrendingUp} label="Failure rate" value={`${stats.failureRate}%`} accent={stats.failureRate > 30 ? "text-destructive" : "text-amber-500"} />
        <Stat icon={Lock} label="Locked now" value={stats.locked} accent="text-amber-500" />
        <Stat icon={Ban} label="Blocked IPs" value={stats.blockedIpsCount} accent="text-destructive" />
        <Stat icon={Globe} label="Unique IPs" value={stats.uniqueIps} />
        <Stat icon={Activity} label="Total" value={stats.total} />
      </div>

      {lockedAccounts.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Active lockouts ({lockedAccounts.length}) — ≥5 failures in 15 min
            </p>
            <div className="flex flex-wrap gap-2">
              {lockedAccounts.map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-amber-500/40 bg-background text-xs">
                  <Lock className="h-3 w-3 text-amber-500" />
                  <span className="font-mono">{k}</span>
                  <Badge variant="outline" className="text-[10px]">{v.count}</Badge>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => clearLockout.mutate(k)} disabled={clearLockout.isPending}>
                    <Unlock className="h-3 w-3 mr-1" /> Clear
                  </Button>
                  {v.ip && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                      onClick={() => { setBlockForm({ ip_address: v.ip!, reason: `Auto-locked: ${k}`, expires_in_hours: "24" }); setBlockOpen(true); }}>
                      <Ban className="h-3 w-3 mr-1" /> Block IP
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Lockouts auto-clear after 15 minutes of inactivity.</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="timeline" className="gap-2"><Clock className="h-4 w-4" />Timeline (24h)</TabsTrigger>
          <TabsTrigger value="ips" className="gap-2"><Globe className="h-4 w-4" />Top IPs</TabsTrigger>
          <TabsTrigger value="blocked" className="gap-2"><Ban className="h-4 w-4" />Blocked IPs
            {blockedIps.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px]">{blockedIps.length}</Badge>}
          </TabsTrigger>
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
                      <TableHead className="text-right">Accounts</TableHead>
                      <TableHead>Last seen</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topIps.map((row) => {
                      const risk = row.fails >= 10 ? "high" : row.fails >= 3 ? "med" : "low";
                      const blocked = blockedIps.some((b: any) => b.ip_address === row.ip);
                      return (
                        <TableRow key={row.ip}>
                          <TableCell className="font-mono text-xs">{row.ip}</TableCell>
                          <TableCell className="text-right text-destructive font-medium">{row.fails}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{row.ok}</TableCell>
                          <TableCell className="text-right">{row.accounts}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(row.lastSeen).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={risk === "high" ? "destructive" : risk === "med" ? "secondary" : "outline"} className="text-[10px] capitalize">{risk}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {blocked ? (
                              <Badge variant="destructive" className="text-[10px]"><Ban className="h-3 w-3 mr-1" />Blocked</Badge>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive"
                                onClick={() => { setBlockForm({ ip_address: row.ip, reason: `${row.fails} failed attempts`, expires_in_hours: "" }); setBlockOpen(true); }}>
                                <Ban className="h-3 w-3 mr-1" /> Block
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

        <TabsContent value="blocked" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">IPs blocked here are denied access at the application layer.</p>
            <Button size="sm" onClick={() => { setBlockForm({ ip_address: "", reason: "", expires_in_hours: "" }); setBlockOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add IP
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {blockedIps.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">No IPs blocked.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Blocked at</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedIps.map((b: any) => {
                      const expired = b.expires_at && +new Date(b.expires_at) < Date.now();
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.ip_address}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{b.reason ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(b.created_at).toLocaleString()}</TableCell>
                          <TableCell className="text-xs">
                            {b.expires_at ? (
                              <span className={expired ? "text-muted-foreground line-through" : "text-amber-500"}>
                                {new Date(b.expires_at).toLocaleString()}
                              </span>
                            ) : <Badge variant="outline" className="text-[10px]">Permanent</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeBlock.mutate(b.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add / confirm block dialog */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban className="h-4 w-4 text-destructive" /> Block IP Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">IP address</Label>
              <Input className="mt-1 font-mono" placeholder="e.g. 192.0.2.1"
                value={blockForm.ip_address}
                onChange={(e) => setBlockForm({ ...blockForm, ip_address: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Input className="mt-1" placeholder="e.g. Brute force attempts"
                value={blockForm.reason}
                onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Expires in hours (blank = permanent)</Label>
              <Input className="mt-1" type="number" min="1" placeholder="24"
                value={blockForm.expires_in_hours}
                onChange={(e) => setBlockForm({ ...blockForm, expires_in_hours: e.target.value })} />
            </div>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
              Block list is enforced by the login function. Browser-side requests from blocked IPs will fail before reaching the auth layer.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => addBlock.mutate()} disabled={addBlock.isPending || !blockForm.ip_address.trim()}>
              {addBlock.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Block IP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
