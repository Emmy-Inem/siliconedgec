// Creates / updates / deletes Google Calendar events on behalf of users who
// have connected their Google account via google-calendar-oauth.
//
// Actions (POST body):
//   { action: "upsert_class", live_class_id, user_ids?: string[] }
//        - Sync this live class to every connected user_id (defaults to all
//          enrolled+registered users for the class).
//   { action: "delete_class", live_class_id }
//        - Remove the Calendar event for every user who has one.
//   { action: "sync_upcoming", user_id }
//        - Sync all upcoming live classes the user can attend (used right
//          after a fresh OAuth connection).
//   { action: "disconnect", user_id }
//        - Revoke + clear stored tokens.
//
// Authorization: requires either a valid user JWT (user can only target self)
// OR the service role key (called internally from other edge functions).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`refresh failed: ${JSON.stringify(json)}`);
  return json as { access_token: string; expires_in: number };
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const { data: row } = await admin.from("google_calendar_tokens")
    .select("refresh_token, access_token, expires_at").eq("user_id", userId).maybeSingle();
  if (!row?.refresh_token) return null;
  const stillValid = row.access_token && row.expires_at && new Date(row.expires_at).getTime() > Date.now() + 60_000;
  if (stillValid) return row.access_token!;
  const refreshed = await refreshAccessToken(row.refresh_token);
  await admin.from("google_calendar_tokens").update({
    access_token: refreshed.access_token,
    expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
  }).eq("user_id", userId);
  return refreshed.access_token;
}

async function fetchLiveClass(id: string) {
  const { data } = await admin.from("live_classes")
    .select("id, course_id, title, description, scheduled_at, duration_minutes, meeting_url, meeting_provider, status").eq("id", id).maybeSingle();
  return data;
}

async function fetchCourseTitle(id: string) {
  const { data } = await admin.from("courses").select("title").eq("id", id).maybeSingle();
  return data?.title ?? "Course";
}

async function fetchAttendees(courseId: string): Promise<string[]> {
  const [enrolled, registered] = await Promise.all([
    admin.from("enrollments").select("user_id").eq("course_id", courseId),
    admin.from("course_registrations").select("user_id").eq("course_id", courseId).not("user_id", "is", null),
  ]);
  const set = new Set<string>();
  (enrolled.data ?? []).forEach((r: any) => r.user_id && set.add(r.user_id));
  (registered.data ?? []).forEach((r: any) => r.user_id && set.add(r.user_id));
  return Array.from(set);
}

function buildEventBody(cls: any, courseTitle: string) {
  const start = new Date(cls.scheduled_at);
  const end = new Date(start.getTime() + (cls.duration_minutes ?? 60) * 60_000);
  return {
    summary: `${cls.title} · ${courseTitle}`,
    description: `${cls.description ?? ""}\n\nJoin: ${cls.meeting_url}\nProvider: ${cls.meeting_provider}`.trim(),
    location: cls.meeting_url,
    source: { title: "Silicon Edge", url: cls.meeting_url },
    start: { dateTime: start.toISOString(), timeZone: "UTC" },
    end: { dateTime: end.toISOString(), timeZone: "UTC" },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }, { method: "popup", minutes: 10 }] },
    conferenceData: undefined,
  };
}

async function upsertEventForUser(userId: string, cls: any, courseTitle: string) {
  const token = await getValidAccessToken(userId);
  if (!token) return { userId, skipped: "not_connected" };

  const { data: existing } = await admin.from("live_class_calendar_events")
    .select("google_event_id").eq("user_id", userId).eq("live_class_id", cls.id).maybeSingle();

  const body = buildEventBody(cls, courseTitle);
  const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const url = existing?.google_event_id ? `${base}/${existing.google_event_id}` : base;
  const method = existing?.google_event_id ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("calendar upsert failed", userId, json);
    return { userId, error: json.error?.message ?? "unknown" };
  }
  if (!existing?.google_event_id) {
    await admin.from("live_class_calendar_events").insert({
      user_id: userId, live_class_id: cls.id, google_event_id: json.id,
    });
  }
  return { userId, ok: true, event_id: json.id };
}

async function deleteEventForUser(userId: string, liveClassId: string) {
  const { data: row } = await admin.from("live_class_calendar_events")
    .select("google_event_id").eq("user_id", userId).eq("live_class_id", liveClassId).maybeSingle();
  if (!row) return { userId, skipped: "no_event" };
  const token = await getValidAccessToken(userId);
  if (!token) return { userId, skipped: "not_connected" };
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${row.google_event_id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  }).catch((e) => console.error("delete failed", e));
  await admin.from("live_class_calendar_events").delete().eq("user_id", userId).eq("live_class_id", liveClassId);
  return { userId, ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceCall = authHeader === `Bearer ${SERVICE_ROLE}`;
    let callerId: string | null = null;
    if (!isServiceCall) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = user.id;
    }

    const body = await req.json();
    const action = body.action as string;

    if (action === "upsert_class") {
      const cls = await fetchLiveClass(body.live_class_id);
      if (!cls || cls.status === "cancelled") {
        return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const courseTitle = await fetchCourseTitle(cls.course_id);
      const users: string[] = body.user_ids?.length ? body.user_ids : await fetchAttendees(cls.course_id);
      const results = [];
      for (const uid of users) results.push(await upsertEventForUser(uid, cls, courseTitle));
      return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_class") {
      const { data: rows } = await admin.from("live_class_calendar_events")
        .select("user_id").eq("live_class_id", body.live_class_id);
      const results = [];
      for (const r of rows ?? []) results.push(await deleteEventForUser(r.user_id, body.live_class_id));
      return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "sync_upcoming") {
      const userId = body.user_id ?? callerId;
      if (!isServiceCall && userId !== callerId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const [enr, reg] = await Promise.all([
        admin.from("enrollments").select("course_id").eq("user_id", userId),
        admin.from("course_registrations").select("course_id").eq("user_id", userId),
      ]);
      const courseIds = Array.from(new Set([
        ...(enr.data ?? []).map((r: any) => r.course_id),
        ...(reg.data ?? []).map((r: any) => r.course_id),
      ]));
      if (!courseIds.length) return new Response(JSON.stringify({ ok: true, synced: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: classes } = await admin.from("live_classes")
        .select("id, course_id, title, description, scheduled_at, duration_minutes, meeting_url, meeting_provider, status")
        .in("course_id", courseIds).gte("scheduled_at", new Date().toISOString()).neq("status", "cancelled");
      let synced = 0;
      for (const cls of classes ?? []) {
        const courseTitle = await fetchCourseTitle(cls.course_id);
        const r = await upsertEventForUser(userId, cls, courseTitle);
        if ((r as any).ok) synced += 1;
      }
      return new Response(JSON.stringify({ ok: true, synced }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "disconnect") {
      const userId = body.user_id ?? callerId;
      if (!isServiceCall && userId !== callerId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: row } = await admin.from("google_calendar_tokens").select("refresh_token").eq("user_id", userId).maybeSingle();
      if (row?.refresh_token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.refresh_token)}`, { method: "POST" }).catch(() => {});
      }
      await admin.from("google_calendar_tokens").delete().eq("user_id", userId);
      await admin.from("live_class_calendar_events").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("google-calendar-sync error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});