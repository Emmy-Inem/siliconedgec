// Sends one enquiry alert to the official enquiries inbox for a saved enquiry.
// - Reads the saved row server-side (never trusts client details).
// - Atomically claims an attempt so repeated calls never duplicate the alert.
// - Records message id / status / error on the enquiry for admins.
// - Admins may retry only an alert whose last attempt failed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const NOTIFY_TO = "info@siliconedgec.com";
const PUBLIC_WINDOW_MS = 24 * 60 * 60 * 1000;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const UUID_RE = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const leadId = typeof body?.lead_id === "string" && UUID_RE.test(body.lead_id) ? body.lead_id : "";
    const wantsRetry = body?.retry === true;
    if (!leadId) return json({ error: "invalid-lead" }, 400);

    // Is the caller a signed-in admin? (needed only for retries)
    let isAdmin = false;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (wantsRetry && token) {
      const { data: u } = await admin.auth.getUser(token);
      if (u?.user) {
        const { data: r } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
        isAdmin = !!r;
      }
    }
    if (wantsRetry && !isAdmin) return json({ error: "forbidden" }, 403);

    const { data: row } = await admin.from("business_leads").select("*").eq("id", leadId).maybeSingle();
    if (!row) return json({ error: "lead-not-found" }, 404);

    // Latest provider outcome for the current alert, if any.
    let lastOutcome: string | null = null;
    if (row.notify_message_id) {
      const { data: log } = await admin.from("email_send_log").select("status")
        .eq("message_id", row.notify_message_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      lastOutcome = log?.status ?? null;
    }
    const previousFailed = row.notify_status === "failed" || lastOutcome === "failed" || lastOutcome === "dlq";

    if (wantsRetry) {
      if (!previousFailed) return json({ ok: true, already: true, status: lastOutcome ?? row.notify_status, message_id: row.notify_message_id });
    } else {
      if (row.notify_attempts > 0) return json({ ok: true, already: true, status: lastOutcome ?? row.notify_status, message_id: row.notify_message_id });
      if (Date.now() - new Date(row.created_at).getTime() > PUBLIC_WINDOW_MS) return json({ ok: true, skipped: "stale" });
    }

    // Atomic claim: only one caller can move attempts from N to N+1.
    const attempt = (row.notify_attempts ?? 0) + 1;
    const messageId = `lead-alert-${row.id}-${attempt}`;
    const { data: claimed } = await admin.from("business_leads")
      .update({ notify_attempts: attempt, notify_status: "sending", notify_message_id: messageId, notify_last_attempt_at: new Date().toISOString(), notify_error: null })
      .eq("id", row.id).eq("notify_attempts", row.notify_attempts ?? 0).select("id").maybeSingle();
    if (!claimed) return json({ ok: true, already: true });

    let courseTitle = "";
    if (row.course_id) {
      const { data: c } = await admin.from("courses").select("title").eq("id", row.course_id).maybeSingle();
      courseTitle = c?.title ?? "";
    }
    const kind = row.lead_type === "course" ? "course enquiry" : row.lead_type === "contact" ? "contact message" : "business inquiry";
    const qa = row.is_test ? "[INTERNAL QA - not a real lead] " : "";

    // In-app notice for admins (genuine enquiries only).
    if (!row.is_test && attempt === 1) {
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      const ids = [...new Set((admins ?? []).map((r: any) => r.user_id))];
      if (ids.length) {
        await admin.from("notifications").insert(ids.map((uid) => ({
          user_id: uid, title: `New ${kind}: ${row.contact_name}`,
          message: `${row.contact_name} (${row.email})${courseTitle ? ` - ${courseTitle}` : ""}`.slice(0, 200),
          type: "info", link: "/admin/people?tab=leads-hub",
        })));
      }
    }

    const lines: [string, unknown][] = [
      ["Type", kind], ["Name", row.contact_name], ["Email", row.email], ["Phone", row.phone],
      ["Company", row.lead_type === "business" ? row.company_name : null], ["Job title", row.job_title],
      ["Course", courseTitle], ["Country", row.country], ["Experience", row.experience_level],
      ["Intended start", row.intended_start], ["Details", row.training_needs], ["Message", row.message],
    ];
    const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;padding:24px">
      ${row.is_test ? `<p style="background:#fef3c7;padding:8px;border-radius:6px"><strong>Internal QA test.</strong> This is not a real enquiry and is excluded from lead reporting.</p>` : ""}
      <h2>New ${esc(kind)}</h2>
      ${lines.filter(([, v]) => v).map(([k, v]) => `<p><strong>${esc(k)}:</strong> ${esc(v).replace(/\n/g, "<br/>")}</p>`).join("")}
      <hr/><p style="color:#64748b;font-size:12px">Saved on the website in Admin → People → Leads Hub (id: ${esc(row.id)}).</p></div>`;

    let status = "failed"; let error: string | null = null;
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ to: NOTIFY_TO, subject: `${qa}New ${kind} from ${row.contact_name}`, html, copy_admins: false, message_id: messageId, category: "transactional" }),
      });
      const res = await r.json().catch(() => ({}));
      const ok = r.ok && Array.isArray(res?.results) ? res.results.some((x: any) => x.ok) : r.ok && !res?.error;
      if (ok) status = "queued"; else error = String(res?.error ?? res?.results?.[0]?.error ?? `HTTP ${r.status}`).slice(0, 500);
    } catch (e) {
      error = String((e as Error)?.message ?? e).slice(0, 500);
    }
    await admin.from("business_leads").update({ notify_status: status, notify_error: error }).eq("id", row.id);
    return json({ ok: status === "queued", status, message_id: messageId, error });
  } catch (err: any) {
    console.error("[notify-business-lead] error", err);
    return json({ error: "internal" }, 500);
  }
});
