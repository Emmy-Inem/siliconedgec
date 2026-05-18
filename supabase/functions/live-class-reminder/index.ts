// Sends a reminder email to enrolled students 1 hour before a live class.
// Triggered by a pg_cron schedule that pings this function every 15 minutes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtUtc(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function buildCalendar(opts: { id: string; title: string; description?: string; location: string; start: Date; durationMin: number }) {
  const end = new Date(opts.start.getTime() + opts.durationMin * 60_000);
  const ics = [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Silicon Edge//Live Class//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.id}@siliconedgec.com`,
    `DTSTAMP:${fmtUtc(new Date())}`,
    `DTSTART:${fmtUtc(opts.start)}`,
    `DTEND:${fmtUtc(end)}`,
    `SUMMARY:${opts.title.replace(/\n/g, " ")}`,
    `DESCRIPTION:${(opts.description ?? "").replace(/\n/g, "\\n")}\\n\\nJoin: ${opts.location}`,
    `LOCATION:${opts.location}`,
    `URL:${opts.location}`,
    "END:VEVENT","END:VCALENDAR",
  ].join("\r\n");
  const params = new URLSearchParams({
    action: "TEMPLATE", text: opts.title,
    dates: `${fmtUtc(opts.start)}/${fmtUtc(end)}`,
    details: `${opts.description ?? ""}\n\nJoin: ${opts.location}`,
    location: opts.location,
  });
  return { ics, gcalUrl: `https://calendar.google.com/calendar/render?${params.toString()}`, b64: btoa(unescape(encodeURIComponent(ics))) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Window: classes scheduled to start between 50 and 80 minutes from now (covers 15-min cron jitter)
    const now = new Date();
    const start = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
    const end = new Date(now.getTime() + 80 * 60 * 1000).toISOString();

    const { data: classes, error } = await supabase
      .from("live_classes")
      .select("id, course_id, title, scheduled_at, meeting_url, instructor_name, reminder_sent_at")
      .gte("scheduled_at", start)
      .lte("scheduled_at", end)
      .neq("status", "cancelled")
      .is("reminder_sent_at", null);
    if (error) throw error;
    if (!classes || classes.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    let sent = 0;

    for (const cls of classes) {
      const cal = buildCalendar({
        id: cls.id, title: cls.title, location: cls.meeting_url,
        start: new Date(cls.scheduled_at), durationMin: 60,
      });
      // Find enrolled users for the class' course
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("course_id", cls.course_id);
      if (!enrollments || enrollments.length === 0) continue;

      const userIds = enrollments.map((e) => e.user_id);
      // Resolve emails via auth admin lookup (batched 50)
      for (const uid of userIds) {
        try {
          const { data: { user } } = await supabase.auth.admin.getUserById(uid);
          if (!user?.email) continue;
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", uid).maybeSingle();
          const when = new Date(cls.scheduled_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" });
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${anon}` },
            body: JSON.stringify({
              template_key: "tpl_live_class_reminder",
              to: user.email,
              variables: {
                name: profile?.full_name || user.email.split("@")[0],
                class_title: cls.title,
                instructor: cls.instructor_name ?? "your instructor",
                start_time: when,
                join_url: cls.meeting_url,
                gcal_url: cal.gcalUrl,
              },
              fallback_subject: `Reminder: ${cls.title} starts in 1 hour`,
              fallback_body: `Hi ${profile?.full_name || ""},\n\nYour live class "${cls.title}" with ${cls.instructor_name ?? "your instructor"} starts at ${when}.\n\nJoin here: ${cls.meeting_url}\nAdd to Google Calendar: ${cal.gcalUrl}\n\nSee you there!`,
              attachments: [{ filename: `${cls.title.replace(/[^a-z0-9]+/gi, "-")}.ics`, content: cal.b64 }],
            }),
          }).catch((e) => console.error("reminder send-email failed", e));
          sent += 1;
        } catch (e) {
          console.error("reminder per-user failed", uid, e);
        }
      }

      // Mark reminder as sent so we don't double-send if cron jitters.
      // We deliberately do NOT mutate `status` so admins/students still see Scheduled / Live / Ended correctly.
      await supabase
        .from("live_classes")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", cls.id);
    }

    return new Response(JSON.stringify({ ok: true, sent, classes: classes.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("live-class-reminder error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});