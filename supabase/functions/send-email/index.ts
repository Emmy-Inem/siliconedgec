// Transactional email sender. Loads admin-managed templates (tpl_*) from
// site_content, applies {{variables}}, and enqueues the message on the
// platform email queue (sender domain notify.siliconedgec.com).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { brandEmail, textToHtml, BRAND } from "../_shared/brand-email.ts";
import { logEmail } from "../_shared/email-log.ts";

const SENDER_DOMAIN = "notify.siliconedgec.com";
const DEFAULT_FROM = `Silicon Edge Consulting <info@${SENDER_DOMAIN}>`;
const EXTRA_ADMIN_EMAILS = ["inememmanuel@gmail.com"];

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

// The email API requires a plain-text alternative alongside the HTML part.
function htmlToText(html: string) {
  return (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
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
      const { data: rows } = await admin
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

    // ---- recipients: the addressee plus (optionally) the internal team ----
    const recipients = new Set<string>([payload.to]);
    // Bulk/nudge automations go to learners only — copying staff on hundreds of
    // these floods inboxes and trips the provider rate limit.
    const BULK_KEYS = new Set(["inactivity_nudge", "cart_abandoned", "cart_added", "lesson_unlocked", "installment_due"]);
    const label = template_key ?? (template as string | undefined) ?? "";
    const wantsAdminCopy =
      (body as any).copy_admins === true ||
      ((body as any).copy_admins !== false && category === "automation" && !BULK_KEYS.has(label));

    if (wantsAdminCopy) {
      const { data: toggle } = await admin
        .from("site_content").select("value").eq("key", "automation_admin_copy").maybeSingle();
      if (toggle?.value !== "off") {
        // Resolve a small set of admin addresses (admins only, capped) from auth users.
        try {
          const { data: roles } = await admin
            .from("user_roles").select("user_id").eq("role", "admin");
          const staffIds = new Set((roles ?? []).map((r: any) => r.user_id));
          const staff: string[] = [];
          let page = 1;
          while (page <= 5 && staff.length < 3) {
            const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
            const users = list?.users ?? [];
            for (const u of users) {
              const em = u.email ?? "";
              if (em && staffIds.has(u.id)) staff.push(em);
            }
            if (users.length < 200) break;
            page++;
          }
          for (const em of staff.slice(0, 3)) recipients.add(em);
        } catch (e) {
          console.error("[send-email] staff lookup failed", e);
        }
        for (const e of EXTRA_ADMIN_EMAILS) recipients.add(e);
      }
    }


    const results: { to: string; ok: boolean; error?: string }[] = [];
    for (const to of recipients) {
      const messageId = crypto.randomUUID();
      const isPrimary = to === payload.to;
      const subject = isPrimary ? payload.subject : `[Silicon Edge copy] ${payload.subject}`;
      try {
        const { error } = await admin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            to,
            from: payload.from ?? DEFAULT_FROM,
            sender_domain: SENDER_DOMAIN,
            subject,
            html: payload.html,
            text: htmlToText(payload.html) || subject,
            purpose: "transactional",
            label: template_key ?? (template as string | undefined) ?? category,
            idempotency_key: messageId,
            message_id: messageId,
            queued_at: new Date().toISOString(),
          },
        });
        if (error) throw new Error(error.message);
        await logEmail({
          ...logBase,
          recipient_email: to,
          subject,
          status: "queued",
          provider: "lovable",
          message_id: messageId,
        });
        results.push({ to, ok: true });
      } catch (e: any) {
        await logEmail({
          ...logBase,
          recipient_email: to,
          subject,
          status: "failed",
          provider: "lovable",
          error_message: e?.message ?? String(e),
        });
        results.push({ to, ok: false, error: e?.message ?? String(e) });
      }
    }

    const ok = results.some((r) => r.ok);
    return new Response(JSON.stringify({ ok, queued: results.filter((r) => r.ok).length, results }), {
      status: ok ? 200 : 502,
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
