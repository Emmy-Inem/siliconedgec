import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Video } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

function countdown(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return "live now";
  const mins = Math.floor(diff / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins % 60}m`;
  return `in ${mins}m`;
}

/** Next live session with a countdown + one-tap RSVP / join. */
export default function UpcomingSessionBanner({ cohortId, userId }: { cohortId: string; userId: string }) {
  const [session, setSession] = useState<any | null>(null);
  const [rsvp, setRsvp] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await db
        .from("cohort_sessions")
        .select("*")
        .eq("cohort_id", cohortId)
        .gte("scheduled_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1);
      const s = (data || [])[0] || null;
      setSession(s);
      if (s) {
        const { data: r } = await db.from("cohort_session_rsvps").select("status").eq("session_id", s.id).eq("user_id", userId).maybeSingle();
        setRsvp(r?.status ?? null);
      }
    })();
  }, [cohortId, userId]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  if (!session) return null;

  const going = async () => {
    const { error } = await db
      .from("cohort_session_rsvps")
      .upsert({ session_id: session.id, user_id: userId, status: "going" }, { onConflict: "session_id,user_id" });
    if (error) return toast.error(error.message);
    setRsvp("going");
    toast.success("You're in — we'll remind you.");
  };

  const isLive = new Date(session.scheduled_at).getTime() - Date.now() < 5 * 60 * 1000;

  return (
    <Card className="p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
      <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
        <Calendar className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-primary font-medium">
          {isLive ? "Live session" : "Next live session"} · {countdown(session.scheduled_at)}
        </div>
        <div className="font-heading font-semibold truncate">{session.title}</div>
        <div className="text-[11px] text-muted-foreground">
          {new Date(session.scheduled_at).toLocaleString()} · {session.duration_minutes} min
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {rsvp !== "going" && <Button size="sm" variant="outline" onClick={going}>I'll attend</Button>}
        {session.meeting_url && (
          <Button size="sm" asChild>
            <a href={session.meeting_url} target="_blank" rel="noreferrer"><Video className="h-3.5 w-3.5 mr-1.5" />{isLive ? "Join now" : "Meeting link"}</a>
          </Button>
        )}
      </div>
    </Card>
  );
}