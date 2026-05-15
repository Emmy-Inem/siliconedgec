// Sends an immediate email + records to all enrolled students when a live class
// is created or rescheduled. Called from the admin UI after the live_classes row
// has been inserted/updated. Uses service role to look up enrolled users' emails.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { live_class_id, kind } = await req.json() as { live_class_id: string; kind?: "new" | "updated" };
    if (!live_class_id) {
      return new Response(JSON.stringify({ error: "live_class_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cls, error: clsErr } = await supabase
      .from("live_classes")
      .select("id, course_id, title, description, scheduled_at, meeting_url, meeting_provider, instructor_name, duration_minutes, status")
      .eq("id", live_class_id)
      .maybeSingle();
    if (clsErr || !cls) throw clsErr ?? new Error("Live class not found");
    if (cls.status === "cancelled") {
      return new Response(JSON.stringify({ ok: true, skipped: "cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: course } = await supabase.from("courses").select("title").eq("id", cls.course_id).maybeSingle();
    const courseTitle = course?.title ?? "your course";

    const { data: enrollments } = await supabase
      .from("enrollments").select("user_id").eq("course_id", cls.course_id);
    const userIds = Array.from(new Set((enrollments ?? []).map((e) => e.user_id)));

    const when = new Date(cls.scheduled_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" });
    const action = kind === "updated" ? "rescheduled" : "scheduled";
    let sent = 0;

    for (const uid of userIds) {
      try {
        const { data: { user: u } } = await supabase.auth.admin.getUserById(uid);
        if (!u?.email) continue;
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", uid).maybeSingle();
        const name = profile?.full_name || u.email.split("@")[0];
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${anon}` },
          body: JSON.stringify({
            to: u.email,
            subject: `📅 Live class ${action}: ${cls.title}`,
            html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:28px;background:#0f172a;color:#fff;border-radius:14px;line-height:1.55">
              <div style="font-size:12px;color:#a78bfa;text-transform:uppercase;letter-spacing:.4px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:12px">Silicon Edge · Live Class</div>
              <h2 style="margin:0 0 8px 0;font-size:20px;color:#fff">Hi ${name},</h2>
              <p>A live class has just been <strong>${action}</strong> for <strong>${courseTitle}</strong>:</p>
              <div style="background:#1e293b;border-radius:10px;padding:16px;margin:16px 0">
                <div style="font-weight:600;font-size:16px;margin-bottom:6px">${cls.title}</div>
                ${cls.description ? `<div style="font-size:13px;color:#cbd5e1;margin-bottom:10px">${cls.description}</div>` : ""}
                <div style="font-size:13px;color:#cbd5e1">📆 ${when}</div>
                <div style="font-size:13px;color:#cbd5e1">⏱️ ${cls.duration_minutes} minutes · ${String(cls.meeting_provider).replace("_", " ")}</div>
                ${cls.instructor_name ? `<div style="font-size:13px;color:#cbd5e1">👤 ${cls.instructor_name}</div>` : ""}
              </div>
              <a href="${cls.meeting_url}" style="display:inline-block;padding:12px 22px;background:#a855f7;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Join the class</a>
              <p style="font-size:12px;color:#94a3b8;margin-top:24px">You'll also get a reminder 1 hour before the class begins.</p>
            </div>`,
          }),
        }).catch((e) => console.error("send-email failed", e));
        sent += 1;
      } catch (e) {
        console.error("notify per-user failed", uid, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, enrolled: userIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("live-class-notify error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});