import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ExternalLink, Video, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildIcsFile, downloadIcs, googleCalendarUrl } from "@/lib/ics";

export function LiveClassesTab({ courseId }: { courseId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["live-classes", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_classes")
        .select("*")
        .eq("course_id", courseId)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground py-6 text-center">Loading sessions…</p>;
  if (!data?.length) {
    return (
      <div className="text-center py-10">
        <Video className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No live sessions scheduled yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((c) => {
        const dt = new Date(c.scheduled_at);
        const now = Date.now();
        const startMs = dt.getTime();
        const endMs = startMs + c.duration_minutes * 60 * 1000;
        const isCancelled = c.status === "cancelled";
        const isPast = now > endMs || c.status === "ended";
        const isLive = !isCancelled && !isPast && (c.status === "live" || (now >= startMs && now <= endMs));
        // Allow joining 10 minutes before scheduled start so students aren't locked out.
        const canJoin = !isCancelled && !isPast && now >= startMs - 10 * 60 * 1000;
        return (
          <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isCancelled ? (
                  <Badge variant="outline" className="text-xs">Cancelled</Badge>
                ) : isLive ? (
                  <Badge className="bg-red-500/10 text-red-600 border-0 text-xs">● Live</Badge>
                ) : isPast ? (
                  <Badge variant="outline" className="text-xs">Past</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Upcoming</Badge>
                )}
                <Badge variant="outline" className="text-xs uppercase">{c.meeting_provider}</Badge>
              </div>
              <p className="font-medium text-sm">{c.title}</p>
              {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{dt.toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })} · {c.duration_minutes}m</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!isPast && !isCancelled && (
                <>
                  <Button
                    size="icon" variant="ghost" title="Download .ics"
                    onClick={() => downloadIcs(
                      `${c.title.replace(/[^\w]+/g, "-").toLowerCase()}.ics`,
                      buildIcsFile({ uid: c.id, title: c.title, description: c.description ?? `Live class · ${c.meeting_provider}`, url: c.meeting_url, start: dt, durationMinutes: c.duration_minutes })
                    )}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Add to Google Calendar" asChild>
                    <a
                      href={googleCalendarUrl({ title: c.title, description: c.description ?? `Live class · ${c.meeting_provider}`, url: c.meeting_url, start: dt, durationMinutes: c.duration_minutes })}
                      target="_blank" rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </>
              )}
              <Button size="sm" disabled={!canJoin} asChild={canJoin} className="gap-1">
                {canJoin
                  ? <a href={c.meeting_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /> Join</a>
                  : <span>{isPast ? "Ended" : isCancelled ? "Cancelled" : "Not yet"}</span>}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
