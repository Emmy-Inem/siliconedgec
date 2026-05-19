import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck2, Loader2, Link2, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TokenRow {
  google_email: string | null;
  connected_at: string;
}

/**
 * Lets a student connect their Google Calendar so live-class events
 * are automatically created and updated in their own calendar.
 */
export function GoogleCalendarConnect() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [row, setRow] = useState<TokenRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("google_calendar_tokens")
      .select("google_email, connected_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setRow(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  // Surface OAuth result coming back from the edge function redirect.
  useEffect(() => {
    const status = params.get("gcal");
    if (!status) return;
    if (status === "connected") {
      toast({ title: "Google Calendar connected", description: "Your upcoming live classes are syncing now." });
      load();
    } else if (status === "no_refresh") {
      toast({ title: "Couldn't connect", description: "Google didn't return a refresh token. Try again and accept all prompts.", variant: "destructive" });
    } else {
      toast({ title: "Connection failed", description: "Please try connecting again.", variant: "destructive" });
    }
    params.delete("gcal");
    setParams(params, { replace: true });
  }, [params]);

  const connect = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-oauth", {
        method: "GET",
        body: undefined,
      } as any);
      // supabase-js doesn't expose query params via invoke for GET; call the URL directly.
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-calendar-oauth?action=start&return_to=${encodeURIComponent(window.location.href.split("?")[0])}`,
        { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } },
      );
      const payload = await res.json();
      if (!res.ok || !payload.url) throw new Error(payload.error ?? "Couldn't start OAuth");
      window.location.href = payload.url;
    } catch (e: any) {
      console.error(e);
      toast({ title: "Couldn't open Google", description: e.message ?? String(e), variant: "destructive" });
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Google Calendar? Future live classes won't sync automatically.")) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("google-calendar-sync", {
      body: { action: "disconnect" },
    });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't disconnect", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Disconnected", description: "Your Google Calendar is no longer linked." });
    setRow(null);
  };

  const resync = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("google-calendar-sync", {
      body: { action: "sync_upcoming" },
    });
    setBusy(false);
    if (error) toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    else toast({ title: "Calendar synced", description: "Upcoming live classes have been pushed to your Google Calendar." });
  };

  if (loading) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <CalendarCheck2 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm">Google Calendar sync</p>
          {row ? (
            <p className="text-xs text-muted-foreground truncate">
              Connected{row.google_email ? ` as ${row.google_email}` : ""} · live classes appear in your calendar automatically.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Connect once — every live class for your courses will be added to your Google Calendar with reminders.</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {row ? (
          <>
            <Badge variant="secondary" className="text-xs">Connected</Badge>
            <Button size="sm" variant="outline" onClick={resync} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Re-sync"}
            </Button>
            <Button size="sm" variant="ghost" onClick={disconnect} disabled={busy} className="text-destructive">
              <Unlink className="h-3.5 w-3.5 mr-1" /> Disconnect
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={connect} disabled={busy} className="gap-1">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            Connect Google Calendar
          </Button>
        )}
      </div>
    </div>
  );
}