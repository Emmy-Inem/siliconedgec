// Sends a broadcast email to ALL registered accounts (or only enrolled users).
// Pulls emails from auth.users via the service-role admin API — these
// addresses are NOT exposed to the client, so this MUST run server-side.
// Updates the matching email_announcements row with the real recipient
// count and final status (sent / partial / failed).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  announcement_id: string;
  subject: string;
  body: string;
  audience: "all" | "enrolled";
}

function wrapHtml(subject: string, body: string) {
  const renderedBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:#a78bfa">${u}</a>`)
    .replace(/\n/g, "<br/>");
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:28px;background:#0f172a;color:#fff;border-radius:14px;line-height:1.55;font-size:14px">
    <div style="font-weight:600;font-size:13px;color:#a78bfa;letter-spacing:.4px;text-transform:uppercase;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:12px">${subject}</div>
    <div>${renderedBody}</div>
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #1e293b;font-size:11px;color:#64748b">Silicon Edge Consulting · Job-Ready Tech Training</div>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Verify caller is an admin.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "missing-auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: userData } = await admin.auth.getUser(token);
    const callerId = userData.user?.id;
    if (!callerId) return new Response(JSON.stringify({ error: "invalid-auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdm } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdm) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { announcement_id, subject, body, audience } = (await req.json()) as Payload;
    if (!announcement_id || !subject || !body) {
      return new Response(JSON.stringify({ error: "missing-fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build the recipient list.
    let allowedUserIds: Set<string> | null = null;
    if (audience === "enrolled") {
      const { data: enr } = await admin.from("enrollments").select("user_id");
      allowedUserIds = new Set((enr ?? []).map((r: any) => r.user_id));
    }

    const recipients: string[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data?.users ?? [];
      for (const u of users) {
        if (!u.email) continue;
        if (allowedUserIds && !allowedUserIds.has(u.id)) continue;
        recipients.push(u.email);
      }
      if (users.length < perPage) break;
      page += 1;
      if (page > 50) break; // safety cap
    }

    const html = wrapHtml(subject, body);

    let sent = 0;
    let failed = 0;
    if (RESEND_KEY) {
      // Resend allows up to 50 recipients per call via `bcc`; chunk to be safe.
      const chunkSize = 50;
      for (let i = 0; i < recipients.length; i += chunkSize) {
        const chunk = recipients.slice(i, i + chunkSize);
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Silicon Edge <onboarding@resend.dev>",
              to: ["announcements@siliconedgec.com"],
              bcc: chunk,
              subject,
              html,
            }),
          });
          if (res.ok) sent += chunk.length; else failed += chunk.length;
        } catch {
          failed += chunk.length;
        }
      }
    } else {
      console.log("[send-bulk-announcement] RESEND_API_KEY not configured. Would have emailed:", recipients.length);
    }

    const status = !RESEND_KEY ? "queued" : failed === 0 ? "sent" : sent === 0 ? "failed" : "partial";
    await admin
      .from("email_announcements")
      .update({ recipient_count: recipients.length, status })
      .eq("id", announcement_id);

    return new Response(
      JSON.stringify({ ok: true, recipients: recipients.length, sent, failed, status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[send-bulk-announcement] error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});