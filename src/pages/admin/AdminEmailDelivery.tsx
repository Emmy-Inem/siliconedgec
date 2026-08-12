import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw } from "lucide-react";

type Row = {
  id: string;
  created_at: string;
  category: string;
  template_key: string | null;
  recipient_email: string;
  subject: string | null;
  status: string;
  error_message: string | null;
  open_count: number;
  click_count: number;
  bounced_at: string | null;
  bounce_type: string | null;
  complained_at: string | null;
  provider: string;
};

const RANGES = [
  { label: "24 hours", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "All time", days: 0 },
];

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  delivered: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  queued: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  skipped: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  bounced: "bg-destructive/10 text-destructive border-destructive/30",
  complained: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function AdminEmailDelivery() {
  const [days, setDays] = useState(7);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-email-delivery", days],
    queryFn: async () => {
      let q = supabase
        .from("email_delivery_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (days > 0) {
        q = q.gte("created_at", new Date(Date.now() - days * 86400000).toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(data.map((r) => r.category).filter(Boolean)))],
    [data],
  );

  const rows = useMemo(
    () =>
      data.filter((r) => {
        if (category !== "all" && r.category !== category) return false;
        if (status !== "all" && r.status !== status) return false;
        if (search) {
          const s = search.toLowerCase();
          if (
            !r.recipient_email?.toLowerCase().includes(s) &&
            !(r.subject ?? "").toLowerCase().includes(s) &&
            !(r.template_key ?? "").toLowerCase().includes(s)
          )
            return false;
        }
        return true;
      }),
    [data, category, status, search],
  );

  const stats = useMemo(() => {
    const s = { total: rows.length, sent: 0, failed: 0, bounced: 0, opens: 0, clicks: 0 };
    for (const r of rows) {
      if (r.status === "sent" || r.status === "delivered") s.sent++;
      if (r.status === "failed" || r.status === "skipped") s.failed++;
      if (r.bounced_at || r.status === "bounced") s.bounced++;
      s.opens += r.open_count ?? 0;
      s.clicks += r.click_count ?? 0;
    }
    return s;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Email delivery log</h2>
          <p className="text-sm text-muted-foreground">
            Every newsletter, automation and support email with its delivery outcome.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Emails", value: stats.total },
          { label: "Sent", value: stats.sent },
          { label: "Failed", value: stats.failed },
          { label: "Bounced", value: stats.bounced },
          { label: "Opens", value: stats.opens },
          { label: "Clicks", value: stats.clicks },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {RANGES.map((r) => (
          <Button key={r.label} size="sm" variant={days === r.days ? "default" : "outline"} onClick={() => setDays(r.days)}>
            {r.label}
          </Button>
        ))}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === "all" ? "All types" : c}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
        >
          {["all", "sent", "queued", "failed", "skipped", "bounced", "complained"].map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
          ))}
        </select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipient, subject or template"
          className="h-9 w-full sm:w-72"
        />
      </div>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No emails logged for this filter yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Sent</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Recipient</th>
                <th className="p-3 font-medium">Subject</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Opens</th>
                <th className="p-3 font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className="text-xs">{r.template_key ?? r.category}</span>
                  </td>
                  <td className="p-3">{r.recipient_email}</td>
                  <td className="p-3 max-w-xs truncate">{r.subject}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={STATUS_STYLES[r.status] ?? ""}>
                      {r.bounced_at ? `bounced${r.bounce_type ? ` (${r.bounce_type})` : ""}` : r.status}
                    </Badge>
                    {r.error_message && (
                      <p className="text-xs text-destructive mt-1 max-w-xs line-clamp-2">{r.error_message}</p>
                    )}
                  </td>
                  <td className="p-3">{r.open_count ?? 0}</td>
                  <td className="p-3">{r.click_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
