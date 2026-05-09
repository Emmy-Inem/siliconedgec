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
  email: string;
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
    const payload = (await req.json()) as Payload;
    if (!payload?.email || !payload?.company_name) {
      return new Response(JSON.stringify({ error: "missing-fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Notify every admin in-app so the inquiry is visible on the site.
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = [...new Set((admins ?? []).map((r: any) => r.user_id))];
    if (adminIds.length) {
      const rows = adminIds.map((uid) => ({
        user_id: uid,
        title: `New business inquiry: ${payload.company_name}`,
        message: `${payload.contact_name} (${payload.email}) — ${(payload.training_needs ?? "").slice(0, 160)}`,
        type: "info" as const,
        link: "/admin/business-leads",
      }));
      await admin.from("notifications").insert(rows);
    }

    // 2. Forward to info@ inbox via send-email (graceful fallback if no provider).
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;padding:24px">
        <h2>New B2B Inquiry</h2>
        <p><strong>Company:</strong> ${esc(payload.company_name)}</p>
        <p><strong>Contact:</strong> ${esc(payload.contact_name)} &lt;${esc(payload.email)}&gt;</p>
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
          subject: `New B2B inquiry from ${payload.company_name}`,
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