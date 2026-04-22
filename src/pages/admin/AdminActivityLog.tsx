import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Activity, User, BookOpen, CreditCard, Shield, FileText, Megaphone, Trash2, Pencil, Plus, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ENTITY_ICONS: Record<string, typeof Activity> = {
  course: BookOpen,
  user: User,
  enrollment: Activity,
  pricing: CreditCard,
  role: Shield,
  content: FileText,
  promo: Megaphone,
};

const ACTION_ICONS: Record<string, typeof Activity> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  create: "text-green-500 bg-green-500/10",
  update: "text-blue-500 bg-blue-500/10",
  delete: "text-red-500 bg-red-500/10",
};

interface LogEntry {
  id: string;
  admin_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin_name?: string;
}

export default function AdminActivityLog() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30d");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-activity-log"],
    queryFn: async () => {
      const [logsRes, profilesRes] = await Promise.all([
        supabase.from("admin_activity_log").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("profiles").select("user_id, full_name"),
      ]);
      if (logsRes.error) throw logsRes.error;

      const profileMap = new Map<string, string>();
      (profilesRes.data ?? []).forEach((p) => profileMap.set(p.user_id, p.full_name ?? "Unknown"));

      return (logsRes.data ?? []).map((l) => ({
        ...l,
        admin_name: profileMap.get(l.admin_user_id) ?? l.admin_user_id.slice(0, 8),
      })) as LogEntry[];
    },
  });

  const admins = useMemo(() => Array.from(new Set(logs.map((l) => l.admin_name))).sort(), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);
  const entities = useMemo(() => Array.from(new Set(logs.map((l) => l.entity_type))).sort(), [logs]);

  const filtered = useMemo(() => {
    const ranges: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const now = Date.now();
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
      if (adminFilter !== "all" && l.admin_name !== adminFilter) return false;
      if (dateRange !== "all" && now - +new Date(l.created_at) > (ranges[dateRange] ?? 0) * 86400000) return false;
      if (search) {
        const q = search.toLowerCase();
        const inDetails = JSON.stringify(l.details ?? {}).toLowerCase().includes(q);
        if (!(l.admin_name?.toLowerCase().includes(q) || l.action.includes(q) || l.entity_type.includes(q) || (l.entity_id ?? "").includes(q) || inDetails)) return false;
      }
      return true;
    });
  }, [logs, actionFilter, entityFilter, adminFilter, dateRange, search]);

  const exportCsv = () => {
    const header = ["Admin", "Action", "Entity", "Entity ID", "Details", "When"];
    const lines = filtered.map((l) => [l.admin_name, l.action, l.entity_type, l.entity_id ?? "", JSON.stringify(l.details ?? {}), new Date(l.created_at).toISOString()]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Activity Log</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} of {logs.length} entries</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </motion.div>

      <div className="grid gap-2 md:grid-cols-[1fr_140px_140px_160px_140px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search admin, entity, ID, details..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All actions</SelectItem>{actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All entities</SelectItem>{entities.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={adminFilter} onValueChange={setAdminFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All admins</SelectItem>{admins.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No activity matches your filters.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.slice(0, 200).map((log, i) => {
              const EntityIcon = ENTITY_ICONS[log.entity_type] ?? Activity;
              const ActionIcon = ACTION_ICONS[log.action] ?? Activity;
              const actionColor = ACTION_COLORS[log.action] ?? "text-muted-foreground bg-muted";

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${actionColor}`}>
                    <ActionIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{log.admin_name}</span>
                      <span className="text-muted-foreground"> {log.action}d </span>
                      <span className="font-medium">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-muted-foreground font-mono text-xs ml-1">({log.entity_id.slice(0, 8)}...)</span>
                      )}
                    </p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(", ")}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  <EntityIcon className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1" />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
