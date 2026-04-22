import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Activity, LogIn, UserPlus, FileEdit, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const ICONS: Record<string, typeof Activity> = { login: LogIn, signup: UserPlus, profile_update: FileEdit };

interface Row {
  id: string; user_id: string | null; action: string; entity_type: string | null;
  entity_id: string | null; ip_address: string | null; user_agent: string | null;
  metadata: Record<string, unknown> | null; created_at: string; full_name?: string;
}

export default function AdminUserActivity() {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["user-activity-log"],
    queryFn: async () => {
      const [{ data: logs }, { data: profiles }] = await Promise.all([
        (supabase.from("user_activity_log") as any).select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("user_id, full_name"),
      ]);
      const map = new Map<string, string>();
      (profiles ?? []).forEach((p: any) => map.set(p.user_id, p.full_name ?? "Unknown"));
      return ((logs ?? []) as Row[]).map((l) => ({ ...l, full_name: l.user_id ? map.get(l.user_id) : "Guest" }));
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const actions = Array.from(new Set(rows.map((r) => r.action)));
  const filtered = rows.filter((r) => {
    if (filterAction !== "all" && r.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.full_name ?? "").toLowerCase().includes(q) || r.action.toLowerCase().includes(q) || (r.ip_address ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Activity className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">User Activity Log</h1>
          <p className="text-sm text-muted-foreground">Logins, signups, and user actions ({rows.length})</p>
        </div>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-[1fr_200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, action, IP..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="bg-background border border-border rounded-md px-3 text-sm h-10" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
          <option value="all">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No activity yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((r, i) => {
              const Icon = ICONS[r.action] ?? Activity;
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.01, 0.3) }} className="flex items-start gap-4 px-5 py-3 hover:bg-muted/30">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{r.full_name ?? "Guest"}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{r.action.replace(/_/g, " ")}</Badge>
                      {r.entity_type && <span className="text-xs text-muted-foreground">on {r.entity_type}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.ip_address && <span className="font-mono">{r.ip_address}</span>}
                      {r.user_agent && <span className="ml-2 truncate inline-block max-w-md align-bottom">{r.user_agent}</span>}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 shrink-0">{new Date(r.created_at).toLocaleString()}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
