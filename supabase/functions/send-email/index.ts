// Transactional email sender. Loads admin-managed templates (tpl_*) from
// site_content, applies {{variables}}, and sends via Resend if configured.
// If RESEND_API_KEY is missing, the call is logged and returns 200 so
// product flows are never blocked.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { brandEmail, textToHtml, BRAND } from "../_shared/brand-email.ts";
import { logEmail } from "../_shared/email-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: { filename: string; content: string }[];
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
    html: brandEmail({
      title: `Welcome aboard, ${name}!`,
      bodyHtml: textToHtml("Your Silicon Edge account is ready. Start exploring our job-ready IT training programs in AI, Cloud and DevOps."),
      cta: { label: "Browse courses", url: `${BRAND.site}/courses` },
    }),
  }),
  enrollment: (name: string, course: string) => ({
    subject: `You're enrolled in ${course}`,
    html: brandEmail({
      title: "Enrollment confirmed",
      bodyHtml: textToHtml(`Hi ${name}, you now have access to ${course}.`),
      cta: { label: "Go to dashboard", url: `${BRAND.site}/dashboard` },
    }),
  }),
  certificate: (name: string, course: string, code: string) => ({
    subject: `Your certificate for ${course} is ready`,
    html: brandEmail({
      title: `Congratulations, ${name}!`,
      bodyHtml: textToHtml(`You've completed ${course}.\n\nVerification code: ${code}`),
      cta: { label: "View certificate", url: `${BRAND.site}/certificates` },
    }),
  }),
} as const;

function applyVars(s: string, vars: Record<string, string>) {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v ?? "");
  }
  return out;
}

function wrapHtml(subject: string, body: string, unsubscribeUrl?: string) {
  return brandEmail({
    title: subject,
    preheader: body.slice(0, 120).replace(/\n/g, " "),
    bodyHtml: textToHtml(body),
    unsubscribeUrl,
  });
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
      payload = { to, subject, html: wrapHtml(subject, renderedBody, (body as any).unsubscribe_url) };
    } else if (template && LEGACY_TEMPLATES[template]) {
      const built = (LEGACY_TEMPLATES[template] as any)(...(data ?? []));
      payload = { to, subject: built.subject, html: built.html };
    } else {
      payload = body as EmailPayload;
    }
    // Preserve attachments passed in via the raw payload or alongside template_key
    if (!payload.attachments && Array.isArray((body as any).attachments)) {
      payload.attachments = (body as any).attachments;
    }

    const category = (body as any).category ?? (template_key ? "transactional" : "transactional");
    const logBase = {
      recipient_email: payload.to,
      subject: payload.subject,
      category,
      template_key: template_key ?? (template as string | undefined) ?? null,
      campaign_id: (body as any).campaign_id ?? null,
      user_id: (body as any).user_id ?? null,
    };

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) {
      console.log("[send-email] RESEND_API_KEY not configured, skipping send", { to: payload.to, subject: payload.subject });
      await logEmail({ ...logBase, status: "skipped", error_message: "No sender domain / provider key configured" });
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
        ...(payload.attachments && payload.attachments.length
          ? { attachments: payload.attachments }
          : {}),
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      await logEmail({ ...logBase, status: "failed", error_message: JSON.stringify(result) });
      throw new Error(JSON.stringify(result));
    }

    await logEmail({ ...logBase, status: "sent", message_id: result.id ?? null });

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
