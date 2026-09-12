// Support ticket notifications: emails admins on new tickets / escalations
// and emails the learner when staff reply or resolve a ticket.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { maskEmail, safeErrorResponse } from "../_shared/errors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = "https://siliconedgec.com";
const FALLBACK_ADMIN_EMAIL = "info@siliconedgec.com";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch (e) {
    console.error("[support-notify] send-email failed", maskEmail(to), e);
  }
}

export async function getAdminEmails(): Promise<string[]> {
  const { data: roles } = await admin
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "support"]);
  const ids = [...new Set((roles ?? []).map((r: any) => r.user_id))];
  const emails: string[] = [];
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) emails.push(data.user.email);
  }
  if (emails.length === 0) emails.push(FALLBACK_ADMIN_EMAIL);
  return [...new Set(emails)];
}

function box(title: string, lines: string[], cta?: { label: string; url: string }) {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:28px;background:#0f172a;color:#fff;border-radius:14px;line-height:1.6;font-size:14px">
    <h2 style="color:#a78bfa;margin:0 0 14px;font-size:18px">${title}</h2>
    ${lines.map((l) => `<p style="margin:6px 0">${l}</p>`).join("")}
    ${cta ? `<a href="${cta.url}" style="display:inline-block;margin-top:18px;padding:10px 20px;background:#a855f7;color:#fff;text-decoration:none;border-radius:8px">${cta.label}</a>` : ""}
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #1e293b;font-size:11px;color:#64748b">Silicon Edge Consulting</div>
  </div>`;
}

export async function notifyAdminsOfTicket(ticketId: string, kind: "created" | "human_request" | "ai_escalation" | "user_reply") {
  const { data: t } = await admin.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!t) return;
  const { data: prof } = await admin.from("profiles").select("full_name").eq("user_id", t.user_id).maybeSingle();
  const title =
    kind === "human_request" ? "A user wants to chat with a human"
      : kind === "ai_escalation" ? "The AI assistant could not answer a question"
      : kind === "user_reply" ? `New reply on ticket #${t.ticket_number}`
      : `New support ticket #${t.ticket_number}`;
  const html = box(title, [
    `<strong>Ticket:</strong> #${t.ticket_number} — ${t.subject}`,
    `<strong>From:</strong> ${prof?.full_name ?? "Learner"} ${t.email ? `(${t.email})` : ""}`,
    `<strong>Priority:</strong> ${t.priority} · <strong>Category:</strong> ${t.category}`,
    `<strong>Message:</strong><br/>${(t.body ?? "").slice(0, 1500).replace(/\n/g, "<br/>")}`,
  ], { label: "Open in admin", url: `${SITE_URL}/admin/support-tickets?ticket=${t.id}` });

  const emails = await getAdminEmails();
  await Promise.all(emails.map((e) => sendEmail(e, `[Support] ${title}`, html)));
}

async function notifyUser(ticketId: string, kind: "created" | "reply" | "resolved", message?: string) {
  const { data: t } = await admin.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!t) return;
  let email = t.email as string | null;
  if (!email) {
    const { data } = await admin.auth.admin.getUserById(t.user_id);
    email = data?.user?.email ?? null;
  }
  if (!email) return;
  const map = {
    created: {
      subject: `We received your request — ticket #${t.ticket_number}`,
      title: "Your support request is with our team",
      lines: [`We've logged your question as ticket <strong>#${t.ticket_number}</strong>: ${t.subject}.`, "A member of the team will reply here and by email shortly."],
    },
    reply: {
      subject: `Reply on your ticket #${t.ticket_number}`,
      title: "Our team replied to your ticket",
      lines: [`<strong>#${t.ticket_number}</strong> — ${t.subject}`, (message ?? "").slice(0, 1500).replace(/\n/g, "<br/>")],
    },
    resolved: {
      subject: `Ticket #${t.ticket_number} resolved`,
      title: "Your ticket has been resolved",
      lines: [`<strong>#${t.ticket_number}</strong> — ${t.subject}`, t.resolution_note ? `Resolution: ${t.resolution_note}` : "If this is still an issue, just reply on the ticket and it reopens automatically."],
    },
  } as const;
  const m = map[kind];
  await sendEmail(email, m.subject, box(m.title, [...m.lines], { label: "View ticket", url: `${SITE_URL}/support/${t.id}` }));
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const isService = token === SERVICE_KEY;
    if (!isService) {
      const supa = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userRes } = await supa.auth.getUser(token);
      if (!userRes?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { ticketId, event, message } = await req.json() as {
      ticketId: string;
      event: "created" | "human_request" | "ai_escalation" | "user_reply" | "admin_reply" | "resolved";
      message?: string;
    };
    if (!ticketId || !event) {
      return new Response(JSON.stringify({ error: "ticketId and event required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (event === "admin_reply") await notifyUser(ticketId, "reply", message);
    else if (event === "resolved") await notifyUser(ticketId, "resolved");
    else {
      await notifyAdminsOfTicket(ticketId, event === "user_reply" ? "user_reply" : event);
      if (event !== "user_reply") await notifyUser(ticketId, "created");
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return safeErrorResponse(e, 500, corsHeaders, "Failed to send support notification");
  }
});
