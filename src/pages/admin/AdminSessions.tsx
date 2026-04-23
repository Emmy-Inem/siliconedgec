import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Monitor, Smartphone, Globe, Search, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";

interface SessionRow {
  id: string;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  created_at: string;
}

function parseUA(ua: string | null) {
  if (!ua) return { device: "Unknown", browser: "—" };
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser = "Other";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  return { device: isMobile ? "Mobile" : "Desktop", browser };
}

export default function AdminSessions() {
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_attempts")
        .select("*")
        .eq("success", true)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as SessionRow[];
    },
    refetchInterval: 30000,
  });

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (r.email || "").toLowerCase().includes(search.toLowerCase()) ||
          (r.ip_address || "").toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  );

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todays = rows.filter((r) => new Date(r.created_at) >= today).length;
    const uniqueUsers = new Set(rows.map((r) => r.email)).size;
    const uniqueIps = new Set(rows.map((r) => r.ip_address)).size;
    return { total: rows.length, todays, uniqueUsers, uniqueIps };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Active Sessions</h1>
          <p className="text-sm text-muted-foreground mt-1">Recent successful sign-ins across the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Sign-ins", value: stats.total },
          { label: "Today", value: stats.todays },
          { label: "Unique Users", value: stats.uniqueUsers },
          { label: "Unique IPs", value: stats.uniqueIps },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
            <div className="text-2xl font-bold font-heading">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by email or IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Device</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Browser</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">IP</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">When</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No sessions found
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const ua = parseUA(r.user_agent);
                    return (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{r.email || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {ua.device === "Mobile" ? (
                              <Smartphone className="h-3.5 w-3.5" />
                            ) : (
                              <Monitor className="h-3.5 w-3.5" />
                            )}
                            {ua.device}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-normal">
                            {ua.browser}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3 w-3" />
                            {r.ip_address || "unknown"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground" title={format(new Date(r.created_at), "PPpp")}>
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}