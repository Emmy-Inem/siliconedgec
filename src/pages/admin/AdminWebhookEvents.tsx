import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminWebhookEvents() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["webhook_events", search],
    queryFn: async () => {
      let q = supabase.from("webhook_events" as any).select("*").order("created_at", { ascending: false }).limit(100);
      if (search) q = q.ilike("provider", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Webhook Events</CardTitle>
        <div className="flex gap-2">
          <Input placeholder="Filter by provider" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No webhook events recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {data.map((e) => (
              <div key={e.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={e.status === "processed" ? "default" : e.status === "failed" ? "destructive" : "secondary"}>
                      {e.status || "pending"}
                    </Badge>
                    <span className="font-medium">{e.provider}</span>
                    <span className="text-muted-foreground">· {e.event_type}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {e.created_at ? formatDistanceToNow(new Date(e.created_at), { addSuffix: true }) : ""}
                  </span>
                </div>
                {e.error_message && <p className="mt-1 text-xs text-destructive">{e.error_message}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}