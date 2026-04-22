import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Activity, LogIn, UserPlus, FileEdit, Search, ChevronRight, ArrowLeft, BookOpen, GraduationCap, ClipboardCheck, Eye, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ICONS: Record<string, typeof Activity> = {
  login: LogIn,
  signup: UserPlus,
  profile_update: FileEdit,
  course_view: Eye,
  course_enroll: GraduationCap,
  webinar_registration: ClipboardCheck,
  lesson_complete: BookOpen,
};

interface ActivityRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  created_at?: string;
  avatar_url?: string | null;
}

export default function AdminUserActivity() {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  // Drilldown filters
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all"); // all | 24h | 7d | 30d
  const [innerSearch, setInnerSearch] = useState("");

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["all-user-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, created_at, avatar_url")
        .order("created_at", { ascending: false });
      return (data ?? []) as ProfileRow[];
    },
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["all-user-activity"],
    queryFn: async () => {
      const { data } = await (supabase.from("user_activity_log") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      return (data ?? []) as ActivityRow[];
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // Map user -> activity stats
  const stats = useMemo(() => {
    const m = new Map<string, { count: number; lastSeen: string; lastAction: string }>();
    activities.forEach((a) => {
      if (!a.user_id) return;
      const cur = m.get(a.user_id);
      if (!cur || cur.lastSeen < a.created_at) {
        m.set(a.user_id, {
          count: (cur?.count ?? 0) + 1,
          lastSeen: a.created_at,
          lastAction: a.action,
        });
      } else {
        cur.count += 1;
      }
    });
    return m;
  }, [activities]);

  const filteredProfiles = useMemo(() => {
    const q = search.toLowerCase();
    return profiles
      .filter((p) => !q || (p.full_name ?? "").toLowerCase().includes(q) || p.user_id.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = stats.get(a.user_id)?.lastSeen ?? a.created_at ?? "";
        const sb = stats.get(b.user_id)?.lastSeen ?? b.created_at ?? "";
        return sb.localeCompare(sa);
      });
  }, [profiles, search, stats]);

  const selectedUser = profiles.find((p) => p.user_id === selectedUserId);
  const allUserActivities = useMemo(
    () => activities.filter((a) => a.user_id === selectedUserId),
    [activities, selectedUserId]
  );

  const availableActions = useMemo(
    () => Array.from(new Set(allUserActivities.map((a) => a.action))).sort(),
    [allUserActivities]
  );

  const userActivities = useMemo(() => {
    const cutoff = (() => {
      const now = Date.now();
      if (dateRange === "24h") return now - 24 * 60 * 60 * 1000;
      if (dateRange === "7d") return now - 7 * 24 * 60 * 60 * 1000;
      if (dateRange === "30d") return now - 30 * 24 * 60 * 60 * 1000;
      return 0;
    })();
    const q = innerSearch.toLowerCase();
    return allUserActivities.filter((a) => {
      if (actionFilter !== "all" && a.action !== actionFilter) return false;
      if (cutoff && new Date(a.created_at).getTime() < cutoff) return false;
      if (q) {
        const blob = `${a.action} ${a.entity_type ?? ""} ${a.entity_id ?? ""} ${JSON.stringify(a.metadata ?? {})}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [allUserActivities, actionFilter, dateRange, innerSearch]);

  if (selectedUserId && selectedUser) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedUserId(null)} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to all users
        </Button>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-heading text-lg font-bold">
              {(selectedUser.full_name ?? "U")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-heading text-2xl font-bold">{selectedUser.full_name ?? "Unknown user"}</h1>
              <p className="text-xs text-muted-foreground font-mono">{selectedUser.user_id}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-heading text-2xl font-bold">{userActivities.length}<span className="text-sm text-muted-foreground font-normal">/{allUserActivities.length}</span></p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">events shown</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search events..." value={innerSearch} onChange={(e) => setInnerSearch(e.target.value)} />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {availableActions.map((a) => (
                <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {userActivities.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No activity recorded yet for this user.</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
              {userActivities.map((a, i) => {
                const Icon = ICONS[a.action] ?? Activity;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.01, 0.3) }}
                    className="flex items-start gap-4 px-5 py-3 hover:bg-muted/30"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] capitalize">{a.action.replace(/_/g, " ")}</Badge>
                        {a.entity_type && <span className="text-xs text-muted-foreground">on {a.entity_type}</span>}
                      </div>
                      {a.metadata && Object.keys(a.metadata).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {Object.entries(a.metadata).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {a.ip_address && <span className="font-mono">{a.ip_address}</span>}
                        {a.user_agent && <span className="ml-2 truncate inline-block max-w-md align-bottom">{a.user_agent}</span>}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 shrink-0">{new Date(a.created_at).toLocaleString()}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Activity className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">User Activity</h1>
          <p className="text-sm text-muted-foreground">
            {profiles.length} accounts · {activities.length} events tracked. Click a user to see their full timeline.
          </p>
        </div>
      </motion.div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or user id..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loadingProfiles || loadingActivities ? (
          <div className="p-12 text-center text-muted-foreground">Loading users...</div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-12 text-center">
            <User className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No users found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[75vh] overflow-y-auto">
            {filteredProfiles.map((p, i) => {
              const s = stats.get(p.user_id);
              const Icon = s?.lastAction ? (ICONS[s.lastAction] ?? Activity) : Activity;
              return (
                <button
                  key={p.user_id}
                  onClick={() => setSelectedUserId(p.user_id)}
                  className="w-full text-left flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-medium text-sm shrink-0">
                    {(p.full_name ?? "U")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.full_name ?? "Unknown user"}</p>
                    <p className="text-[11px] text-muted-foreground/70 font-mono truncate">{p.user_id}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Icon className="h-3 w-3" />
                      {s?.count ?? 0} events
                    </Badge>
                    {s?.lastSeen && (
                      <span className="text-[10px] text-muted-foreground/70">
                        Last: {new Date(s.lastSeen).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
