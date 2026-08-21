import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw } from "lucide-react";

type QueueRow = { queue: string; length: number | null; oldest_at: string | null };
type LogRow = {
  id: string;
  message_id: string | null;
  template_name: string | null;
  recipient_email: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  retry_count: number;
};
type Overview = {
  queues: QueueRow[];
  recent: LogRow[];
  state: Record<string, unknown> | null;
};

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  rate_limited: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  suppressed: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  dlq: "bg-destructive/10 text-destructive border-destructive/30",
};

const QUEUE_LABELS: Record<string, string> = {
  auth_emails: "Auth queue",
  transactional_emails: "App email queue",
  auth_emails_dlq: "Auth dead letters",
  transactional_emails_dlq: "App dead letters",
};

export default function AdminEmailQueue() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ["admin-email-queue"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_email_queue_overview", { p_limit: 300 });
      if (error) throw error;
      return data as unknown as Overview;
    },
    refetchInterval: 30000,
  });

  const queues = data?.queues ?? [];
  const recent = useMemo(() => data?.recent ?? [], [data]);

  const rows = useMemo(
    () =>
      recent.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (search) {
          const s = search.toLowerCase();
          return (
            (r.recipient_email ?? "").toLowerCase().includes(s) ||
            (r.message_id ?? "").toLowerCase().includes(s) ||
            (r.template_name ?? "").toLowerCase().includes(s)
          );
        }
        return true;
      }),
    [recent, status, search],
  );

  const errors = useMemo(
    () => recent.filter((r) => r.error_message && ["failed", "dlq", "rate_limited"].includes(r.status)),
    [recent],
  );

  const statuses = useMemo(
    () => ["all", ...Array.from(new Set(recent.map((r) => r.status)))],
    [recent],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Email queue status</h2>
          <p className="text-sm text-muted-foreground">
            Live queue depth, dead letters and the most recent send attempts with their errors.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {(error as Error).message}
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {queues.map((q) => (
          <Card key={q.queue} className="p-4">
            <p className="text-xs text-muted-foreground">{QUEUE_LABELS[q.queue] ?? q.queue}</p>
            <p className="text-2xl font-semibold">{q.length ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {q.oldest_at ? `Oldest ${new Date(q.oldest_at).toLocaleString()}` : "Empty"}
            </p>
          </Card>
        ))}
      </div>

      {errors.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Recent delivery errors</h3>
          <div className="space-y-2">
            {errors.slice(0, 8).map((e) => (
              <div key={e.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={STATUS_STYLES[e.status] ?? ""}>{e.status}</Badge>
                  <span className="font-medium">{e.recipient_email}</span>
                  <span className="text-xs text-muted-foreground">retries: {e.retry_count}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 break-all">ID {e.message_id ?? "—"}</p>
                <p className="text-xs text-destructive mt-1">{e.error_message}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
          ))}
        </select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipient, message ID or template"
          className="h-9 w-full sm:w-80"
        />
      </div>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No send attempts recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Time</th>
                <th className="p-3 font-medium">Template</th>
                <th className="p-3 font-medium">Recipient</th>
                <th className="p-3 font-medium">Message ID</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Retries</th>
                <th className="p-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">{r.template_name ?? "—"}</td>
                  <td className="p-3">{r.recipient_email}</td>
                  <td className="p-3 text-xs break-all max-w-[12rem]">{r.message_id ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={STATUS_STYLES[r.status] ?? ""}>{r.status}</Badge>
                  </td>
                  <td className="p-3">{r.retry_count}</td>
                  <td className="p-3 max-w-xs text-xs text-destructive line-clamp-3">{r.error_message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
