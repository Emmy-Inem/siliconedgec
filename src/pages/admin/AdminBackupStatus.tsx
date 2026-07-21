import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Database, HardDrive, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "@/components/EmptyState";

interface BackupRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  tables_backed_up: number | null;
  total_rows: number | null;
  bytes_uploaded: number | null;
  destination: string | null;
  error_message: string | null;
  details: any;
}

function bytes(n: number | null) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n; let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export default function AdminBackupStatus() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["backup-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_runs" as any)
        .select("*")
        .order("started_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as unknown as BackupRun[];
    },
    refetchInterval: 30_000,
  });

  const runBackup = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("backup-to-drive", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Backup started", description: "Refresh in a moment to see results." });
      qc.invalidateQueries({ queryKey: ["backup-runs"] });
    },
    onError: (e: any) => toast({ title: "Backup failed", description: e.message, variant: "destructive" }),
  });

  const last = data?.[0];
  const lastSuccess = data?.find((r) => r.status === "success");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-heading text-xl font-bold">Backup Status</h2>
          <p className="text-sm text-muted-foreground">Automated database snapshots to Google Drive.</p>
        </div>
        <Button onClick={() => runBackup.mutate()} disabled={runBackup.isPending}>
          {runBackup.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Run backup now
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border p-4 bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Last run</div>
          <p className="font-heading text-lg mt-1">
            {last ? formatDistanceToNow(new Date(last.started_at), { addSuffix: true }) : "Never"}
          </p>
          {last && <Badge variant={last.status === "success" ? "default" : last.status === "failed" ? "destructive" : "secondary"} className="mt-2">{last.status}</Badge>}
        </div>
        <div className="rounded-2xl border border-border p-4 bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Database className="h-3.5 w-3.5" /> Last success rows</div>
          <p className="font-heading text-lg mt-1">{lastSuccess?.total_rows?.toLocaleString() ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">{lastSuccess?.tables_backed_up ?? 0} tables</p>
        </div>
        <div className="rounded-2xl border border-border p-4 bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><HardDrive className="h-3.5 w-3.5" /> Last size</div>
          <p className="font-heading text-lg mt-1">{bytes(lastSuccess?.bytes_uploaded ?? null)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">Recent runs</div>
        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !data || data.length === 0 ? (
          <div className="p-6"><EmptyState icon={Database} title="No backups yet" description="Click 'Run backup now' above to create your first Google Drive snapshot." /></div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                {r.status === "success" ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> :
                 r.status === "failed" ? <XCircle className="h-4 w-4 text-destructive shrink-0" /> :
                 <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {new Date(r.started_at).toLocaleString()}
                    {r.destination && <span className="text-muted-foreground"> · {r.destination}</span>}
                  </p>
                  {r.error_message && <p className="text-xs text-destructive truncate">{r.error_message}</p>}
                  {r.details?.drive_file_url && (
                    <a href={r.details.drive_file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline truncate inline-block">View file</a>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <p>{r.total_rows?.toLocaleString() ?? 0} rows</p>
                  <p>{bytes(r.bytes_uploaded)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}