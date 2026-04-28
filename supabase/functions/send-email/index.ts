// Transactional email sender. Loads admin-managed templates (tpl_*) from
// site_content, applies {{variables}}, and sends via Resend if configured.
// If RESEND_API_KEY is missing, the call is logged and returns 200 so
// product flows are never blocked.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Hard fallback in case the admin hasn't customised a template yet.
const FALLBACK_TEMPLATES: Record<string, { subject: string; body: string }> = {
  tpl_welcome: {
    subject: "Welcome to Silicon Edge!",
    body: "Hi {{name}},\n\nWelcome aboard! Start exploring courses at {{site_url}}/courses.\n\n— The Silicon Edge Team",
  },
  tpl_enrollment: {
    subject: "You're enrolled in {{course_title}}",
    body: "Hi {{name}},\n\nYour enrollment is confirmed. Begin learning here: {{course_url}}.\n\nGood luck!",
  },
  tpl_certificate: {
    subject: "🎓 Certificate ready: {{course_title}}",
    body: "Congratulations {{name}}!\n\nYou've successfully completed {{course_title}}.\n\nVerify your certificate: {{verify_url}}.",
  },
  tpl_reset: {
    subject: "Reset your password",
    body: "Hi {{name}},\n\nClick the link to reset your password: {{reset_url}}.\n\nThis link expires in 1 hour.",
  },
  tpl_cart_recovery: {
    subject: "Your cart is waiting",
    body: "Hi {{name}},\n\nYou left items in your cart. Complete your purchase: {{cart_url}}.",
  },
  tpl_live_class_reminder: {
    subject: "Reminder: {{class_title}} starts in 1 hour",
    body: "Hi {{name}},\n\nYour live class \"{{class_title}}\" with {{instructor}} begins at {{start_time}}.\n\nJoin here: {{join_url}}\n\nSee you there!",
  },
};

const LEGACY_TEMPLATES = {
  welcome: (name: string) => ({
    subject: "Welcome to Silicon Edge Consulting",
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0f172a;color:#fff;border-radius:12px">
      <h1 style="color:#a855f7">Welcome aboard, ${name}!</h1>
      <p>Your Silicon Edge account is ready. Start exploring our job-ready IT training programs in AI, Cloud, and DevOps.</p>
      <a href="https://siliconedgec.com/courses" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#a855f7;color:#fff;text-decoration:none;border-radius:8px">Browse Courses</a>
    </div>`,
  }),
  enrollment: (name: string, course: string) => ({
    subject: `You're enrolled in ${course}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0f172a;color:#fff;border-radius:12px">
      <h1 style="color:#a855f7">Enrollment confirmed</h1>
      <p>Hi ${name}, you now have lifetime access to <strong>${course}</strong>.</p>
      <a href="https://siliconedgec.com/dashboard" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#a855f7;color:#fff;text-decoration:none;border-radius:8px">Go to Dashboard</a>
    </div>`,
  }),
  certificate: (name: string, course: string, code: string) => ({
    subject: `Your certificate for ${course} is ready`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0f172a;color:#fff;border-radius:12px">
      <h1 style="color:#fbbf24">Congratulations, ${name}! 🎓</h1>
      <p>You've completed <strong>${course}</strong>. Verification code: <code>${code}</code></p>
      <a href="https://siliconedgec.com/certificates" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#a855f7;color:#fff;text-decoration:none;border-radius:8px">View Certificate</a>
    </div>`,
  }),
} as const;

function applyVars(s: string, vars: Record<string, string>) {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v ?? "");
  }
  return out;
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

  try {
    const body = await req.json();
    const {
      template_key,
      variables,
      template,
      to,
      data,
    } = body as {
      template_key?: string;
      variables?: Record<string, string>;
      template?: keyof typeof LEGACY_TEMPLATES;
      to: string;
      data?: any;
    } & Partial<EmailPayload>;

    let payload: EmailPayload;

    if (template_key) {
      // New path: load admin-managed template from site_content (tpl_* keys)
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data: rows } = await supabase
        .from("site_content")
        .select("key, value")
        .in("key", [`${template_key}_subject`, `${template_key}_body`]);
      const map = Object.fromEntries((rows ?? []).map((r: any) => [r.key, r.value as string]));
      const fallback = FALLBACK_TEMPLATES[template_key] ?? { subject: "", body: "" };
      const rawSubject = map[`${template_key}_subject`] || fallback.subject;
      const rawBody = map[`${template_key}_body`] || fallback.body;
      const vars = {
        site_url: "https://siliconedgec.com",
        ...(variables ?? {}),
      };
      const subject = applyVars(rawSubject, vars);
      const renderedBody = applyVars(rawBody, vars);
      payload = { to, subject, html: wrapHtml(subject, renderedBody) };
    } else if (template && LEGACY_TEMPLATES[template]) {
      const built = (LEGACY_TEMPLATES[template] as any)(...(data ?? []));
      payload = { to, subject: built.subject, html: built.html };
    } else {
      payload = body as EmailPayload;
    }

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) {
      console.log("[send-email] RESEND_API_KEY not configured, skipping send", { to: payload.to, subject: payload.subject });
      return new Response(JSON.stringify({ skipped: true, reason: "RESEND_API_KEY not set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from ?? "Silicon Edge <onboarding@resend.dev>",
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(result));

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[send-email] error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
