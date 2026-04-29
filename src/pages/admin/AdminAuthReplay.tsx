import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogIn, KeyRound, Mail, ShieldCheck, ArrowRight, User2, Globe, Filter } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

/**
 * Auth event replay — chronological per-user (or per-anonymous-session) timeline
 * of the auth funnel events emitted by `UtmTracker`. Lets ops eyeball whether
 * UTMs/next-redirect/has_recovery_token survived navigation across mobile.
 *
 * Pulls the last 500 auth-flagged lead_sources rows and groups them by:
 *   - user_id when present (signed-in mid-flow)
 *   - otherwise by (utm_source|utm_campaign|landing_page) — best effort to
 *     stitch together the same anonymous funnel without writing a session id
 *     to the lead_sources table.
 */

const AUTH_TYPES = [
  "auth_signin_view",
  "auth_signup_view",
  "auth_forgot_password_view",
  "auth_reset_password_view",
] as const;

type Row = {
  id: string;
  created_at: string;
  form_type: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referrer: string | null;
  user_id: string | null;
  form_data: Record<string, unknown> | null;
};

const ICONS: Record<string, typeof LogIn> = {
  auth_signin_view: LogIn,
  auth_signup_view: User2,
  auth_forgot_password_view: Mail,
  auth_reset_password_view: KeyRound,
};

const LABELS: Record<string, string> = {
  auth_signin_view: "Sign-in viewed",
  auth_signup_view: "Sign-up viewed",
  auth_forgot_password_view: "Forgot-password viewed",
  auth_reset_password_view: "Reset-password viewed",
};

function sessionKey(r: Row): string {
  if (r.user_id) return `user:${r.user_id}`;
  return `anon:${r.utm_source ?? "-"}|${r.utm_campaign ?? "-"}|${r.landing_page ?? "-"}|${(r.referrer ?? "").slice(0, 60)}`;
}

export default function AdminAuthReplay() {
  const [filter, setFilter] = useState<"all" | "with_utm" | "with_recovery">("all");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-auth-replay"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("lead_sources")
        .select("*")
        .in("form_type", AUTH_TYPES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    refetchInterval: 30_000,
  });

  const sessions = useMemo(() => {
    const rows = (data ?? []).filter((r) => {
      if (filter === "with_utm") return Boolean(r.utm_source || r.utm_campaign);
      if (filter === "with_recovery") return Boolean((r.form_data as any)?.has_recovery_token);
      return true;
    });
    const groups = new Map<string, Row[]>();
    rows.forEach((r) => {
      const k = sessionKey(r);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(r);
    });
    // Sort each session's events oldest → newest, sessions newest first
    return Array.from(groups.entries())
      .map(([k, evs]) => ({
        key: k,
        events: [...evs].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
        latest: evs.reduce((acc, r) => (acc && +new Date(acc.created_at) > +new Date(r.created_at) ? acc : r)),
      }))
      .sort((a, b) => +new Date(b.latest.created_at) - +new Date(a.latest.created_at))
      .slice(0, 60);
  }, [data, filter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const total = data?.length ?? 0;
  const withUtm = (data ?? []).filter((r) => r.utm_source || r.utm_campaign).length;
  const withRecovery = (data ?? []).filter((r) => (r.form_data as any)?.has_recovery_token).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-heading font-semibold">Auth event replay</h2>
          <p className="text-sm text-muted-foreground">
            Chronological timeline of /sign-in, /sign-up, /forgot-password, /reset-password views. Verifies UTMs and `next` redirect survive mobile navigation.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 inline-flex items-center gap-2"
        >
          {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Auth events</p>
          <p className="text-3xl font-bold mt-1">{total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">With UTM</p>
          <p className="text-3xl font-bold mt-1">{withUtm}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Recovery flow</p>
          <p className="text-3xl font-bold mt-1">{withRecovery}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Sessions</p>
          <p className="text-3xl font-bold mt-1">{sessions.length}</p>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {(["all", "with_utm", "with_recovery"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md border transition-colors ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary"
            }`}
          >
            {f === "all" ? "All sessions" : f === "with_utm" ? "With UTM" : "Recovery only"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sessions.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No auth events match this filter yet.
          </Card>
        )}
        {sessions.map(({ key, events, latest }) => {
          const utmBits = [latest.utm_source, latest.utm_medium, latest.utm_campaign].filter(Boolean).join(" / ");
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm">
                  {key.startsWith("user:") ? (
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      user · {key.slice(5, 13)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      <Globe className="h-3 w-3 mr-1" /> anon
                    </Badge>
                  )}
                  {utmBits && (
                    <Badge variant="secondary" className="font-mono text-[10px] truncate max-w-[260px]">
                      {utmBits}
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {events.length} step{events.length === 1 ? "" : "s"} · last {formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })}
                </span>
              </div>

              <ol className="relative border-l border-border ml-2 pl-5 space-y-3">
                {events.map((e, idx) => {
                  const Icon = ICONS[e.form_type ?? ""] ?? LogIn;
                  const fd = (e.form_data ?? {}) as any;
                  return (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[27px] top-0.5 grid place-items-center h-5 w-5 rounded-full bg-primary/10 ring-2 ring-background">
                        <Icon className="h-3 w-3 text-primary" />
                      </span>
                      <div className="text-sm font-medium">
                        {LABELS[e.form_type ?? ""] ?? e.form_type}
                        {fd.has_recovery_token && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">recovery token</Badge>
                        )}
                        {fd.email_hint_present && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">email prefilled</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{format(new Date(e.created_at), "MMM dd HH:mm:ss")}</span>
                        {fd.next && (
                          <span className="inline-flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" /> {String(fd.next).slice(0, 60)}
                          </span>
                        )}
                        {e.referrer && idx === 0 && (
                          <span className="truncate max-w-[260px]">via {e.referrer}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
