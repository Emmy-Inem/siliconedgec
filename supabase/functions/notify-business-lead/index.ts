// Triggered when a B2B inquiry is submitted from the For Businesses page.
// Saves a notification copy for every admin (so it's visible on the site)
// AND attempts to email info@siliconedgec.com via send-email (which itself
// no-ops gracefully if no provider is configured). The lead row is already
// stored client-side; this function only handles the side-channels.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  lead_id: string;
  company_name: string;
  contact_name: string;
  job_title?: string;
  email: string;
  phone?: string;
  company_size?: string;
  training_needs?: string;
}

const NOTIFY_TO = "info@siliconedgec.com";

function esc(s: string) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const leadId = typeof body?.lead_id === "string" ? body.lead_id : "";
    // Load the saved row server-side; never trust client-sent details.
    const { data: row } = leadId
      ? await admin.from("business_leads").select("*").eq("id", leadId).maybeSingle()
      : { data: null };
    if (!row) {
      return new Response(JSON.stringify({ error: "lead-not-found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Only notify once, and only for recent rows (prevents replay spam).
    if (row.is_test || Date.now() - new Date(row.created_at).getTime() > 15 * 60 * 1000) {
      return new Response(JSON.stringify({ ok: true, skipped: row.is_test ? "test" : "stale" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let courseTitle = "";
    if (row.course_id) {
      const { data: c } = await admin.from("courses").select("title").eq("id", row.course_id).maybeSingle();
      courseTitle = c?.title ?? "";
    }
    const kind = row.lead_type === "course" ? "course enquiry" : row.lead_type === "contact" ? "contact message" : "business inquiry";
    const payload: Payload = {
      lead_id: row.id, company_name: row.company_name, contact_name: row.contact_name, job_title: row.job_title ?? undefined,
      email: row.email, phone: row.phone ?? undefined, company_size: row.company_size ?? undefined,
      training_needs: [courseTitle && `Course: ${courseTitle}`, row.country && `Country: ${row.country}`,
        row.experience_level && `Experience: ${row.experience_level}`, row.intended_start && `Intended start: ${row.intended_start}`,
        row.training_needs, row.message].filter(Boolean).join("\n"),
    };

    // 1. Notify every admin in-app so the inquiry is visible on the site.
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = [...new Set((admins ?? []).map((r: any) => r.user_id))];
    if (adminIds.length) {
      const rows = adminIds.map((uid) => ({
        user_id: uid,
        title: `New ${kind}: ${payload.contact_name}`,
        message: `${payload.contact_name} (${payload.email}) — ${(payload.training_needs ?? "").slice(0, 160)}`,
        type: "info" as const,
        link: "/admin/business-leads",
      }));
      await admin.from("notifications").insert(rows);
    }

    // 2. Forward to info@ inbox via send-email (graceful fallback if no provider).
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;padding:24px">
        <h2>New ${esc(kind)}</h2>
        <p><strong>Company:</strong> ${esc(payload.company_name)}</p>
        <p><strong>Contact:</strong> ${esc(payload.contact_name)}${payload.job_title ? ` — ${esc(payload.job_title)}` : ""} &lt;${esc(payload.email)}&gt;</p>
        ${payload.phone ? `<p><strong>Phone:</strong> ${esc(payload.phone)}</p>` : ""}
        <p><strong>Company size:</strong> ${esc(payload.company_size ?? "—")}</p>
        <p><strong>Training needs:</strong><br/>${esc(payload.training_needs ?? "—").replace(/\n/g, "<br/>")}</p>
        <hr/>
        <p style="color:#64748b;font-size:12px">Saved on the website at /admin/business-leads (id: ${esc(payload.lead_id)}).</p>
      </div>
    `;
    let emailResult: any = { skipped: true };
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({
          to: NOTIFY_TO,
          subject: `New ${kind} from ${payload.contact_name}`,
          html,
        }),
      });
      emailResult = await r.json();
    } catch (e) {
      console.error("[notify-business-lead] forward failed", e);
    }

    return new Response(JSON.stringify({ ok: true, notified_admins: adminIds.length, email: emailResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[notify-business-lead] error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});