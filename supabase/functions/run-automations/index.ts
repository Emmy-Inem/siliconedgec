// Drains the automation_events queue and sends milestone emails.
// Scheduled via pg_cron; also safe to invoke manually.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { brandEmail } from "../_shared/brand-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = "https://siliconedgec.com";
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

type Built = { subject: string; title: string; lines: string[]; cta?: { label: string; url: string } };

async function courseTitle(id?: string) {
  if (!id) return "your course";
  const { data } = await admin.from("courses").select("title").eq("id", id).maybeSingle();
  return data?.title ?? "your course";
}

async function lessonTitle(id?: string) {
  if (!id) return "a new lesson";
  const { data } = await admin.from("lessons").select("title").eq("id", id).maybeSingle();
  return data?.title ?? "a new lesson";
}

function money(amount?: number | null, currency?: string | null) {
  const n = Number(amount ?? 0);
  const cur = (currency || "NGN").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${cur} ${n.toLocaleString()}`;
  }
}

async function build(key: string, payload: any, name: string): Promise<Built | null> {
  switch (key) {
    case "welcome":
      return { subject: "Welcome to Silicon Edge", title: `Welcome aboard, ${name}!`, lines: ["Your account is ready. Explore job-ready training in AI, Cloud and DevOps."], cta: { label: "Browse courses", url: `${SITE}/courses` } };
    case "enrollment_confirmed": {
      const t = await courseTitle(payload?.course_id);
      return { subject: `You're enrolled in ${t}`, title: "Enrolment confirmed", lines: [`Hi ${name}, your place on <strong>${t}</strong> is confirmed.`], cta: { label: "Start learning", url: `${SITE}/dashboard` } };
    }
    case "first_lesson_completed":
      return { subject: "Great start — first lesson done", title: "You're off the mark", lines: [`Nice work ${name}, you completed your first lesson. Keep the streak going.`], cta: { label: "Continue", url: `${SITE}/dashboard` } };
    case "certificate_ready":
      return { subject: "🎓 Your certificate is ready", title: "Congratulations!", lines: [`You've completed your programme, ${name}. Your certificate is ready to download.`, payload?.verification_code ? `Verification code: <code>${payload.verification_code}</code>` : ""].filter(Boolean), cta: { label: "View certificate", url: `${SITE}/certificates` } };
    case "cohort_access_granted":
      return { subject: "You've been added to a cohort", title: "Welcome to your cohort", lines: [`Hi ${name}, you now have access to your cohort space — live sessions, discussions and materials live there.`], cta: { label: "Open cohort space", url: `${SITE}/cohorts` } };
    case "first_assignment_submitted":
      return { subject: "Assignment submitted", title: "Submission received", lines: [`Thanks ${name} — your assignment is in and your instructor will grade it shortly.`], cta: { label: "View assignments", url: `${SITE}/dashboard` } };
    case "assignment_graded":
      return { subject: "Your assignment has been graded", title: "Feedback is ready", lines: [`Hi ${name}, your instructor graded your assignment${payload?.grade != null ? ` — score: <strong>${payload.grade}</strong>` : ""}.`], cta: { label: "See feedback", url: `${SITE}/dashboard` } };

    // ---------- commerce ----------
    case "cart_added": {
      const t = await courseTitle(payload?.course_id);
      return { subject: `${t} is waiting in your cart`, title: "Ready when you are", lines: [`Hi ${name}, you added <strong>${t}</strong> to your cart. Complete checkout to unlock the lessons straight away.`], cta: { label: "Complete checkout", url: `${SITE}/cart` } };
    }
    case "cart_abandoned":
      return { subject: "You left something in your cart", title: "Still interested?", lines: [`Hi ${name}, the course${Number(payload?.items ?? 1) > 1 ? "s" : ""} in your cart ${Number(payload?.items ?? 1) > 1 ? "are" : "is"} still available. Checkout takes under a minute.`], cta: { label: "Return to cart", url: `${SITE}/cart` } };
    case "purchase_confirmed": {
      const t = await courseTitle(payload?.course_id);
      return {
        subject: `Payment received — ${t}`,
        title: "Thank you for your purchase",
        lines: [
          `Hi ${name}, we've received your payment of <strong>${money(payload?.amount, payload?.currency)}</strong> for <strong>${t}</strong>.`,
          payload?.reference ? `Reference: <code>${payload.reference}</code>` : "",
        ].filter(Boolean),
        cta: { label: "Start learning", url: `${SITE}/dashboard` },
      };
    }
    case "payment_failed": {
      const t = await courseTitle(payload?.course_id);
      return { subject: "Your payment didn't go through", title: "Payment unsuccessful", lines: [`Hi ${name}, your payment for <strong>${t}</strong> was not completed. No money has left your account — you can try again any time.`], cta: { label: "Try again", url: `${SITE}/courses` } };
    }
    case "installment_due":
      return { subject: "Your next instalment is due soon", title: "Instalment reminder", lines: [`Hi ${name}, your next instalment${payload?.due_date ? ` is due on <strong>${payload.due_date}</strong>` : " is due soon"}${payload?.balance != null ? ` — outstanding balance ${money(payload.balance)}` : ""}. Keeping payments current keeps your course access active.`], cta: { label: "View my plan", url: `${SITE}/account` } };

    // ---------- learning ----------
    case "lesson_unlocked": {
      const l = await lessonTitle(payload?.lesson_id);
      return { subject: `New lesson unlocked: ${l}`, title: "A new lesson is open", lines: [`Hi ${name}, <strong>${l}</strong> is now unlocked for you. Pick up where you left off.`], cta: { label: "Open lesson", url: `${SITE}/dashboard` } };
    }
    case "assignment_published": {
      const t = await courseTitle(payload?.course_id);
      return { subject: `New assignment in ${t}`, title: "New assignment published", lines: [`Hi ${name}, your instructor published <strong>${payload?.title ?? "a new assignment"}</strong> in ${t}.`], cta: { label: "View assignment", url: `${SITE}/dashboard` } };
    }
    case "inactivity_nudge":
      return { subject: "Your course is waiting", title: "Let's get back to it", lines: [`Hi ${name}, it's been a week since your last lesson. Even 15 minutes today keeps your momentum going.`], cta: { label: "Resume learning", url: `${SITE}/dashboard` } };

    // ---------- support ----------
    case "ticket_created":
      return { subject: `We've got your request (#${payload?.ticket_number ?? ""})`, title: "Support request received", lines: [`Hi ${name}, thanks for reaching out about <strong>${payload?.subject ?? "your question"}</strong>. A member of our team will reply shortly.`], cta: { label: "View your ticket", url: `${SITE}/support` } };
    case "ticket_resolved":
      return { subject: `Your request has been resolved (#${payload?.ticket_number ?? ""})`, title: "All sorted", lines: [`Hi ${name}, we've marked <strong>${payload?.subject ?? "your request"}</strong> as resolved. Reply on the ticket if anything is still outstanding.`], cta: { label: "Open ticket", url: `${SITE}/support` } };

    // ---------- partner programme ----------
    case "affiliate_application_received":
      return { subject: "We received your partner application", title: "Application received", lines: [`Thanks ${name} — your partner application is in review. We usually respond within two working days.`], cta: { label: "Visit the partner page", url: `${SITE}/career` } };
    case "affiliate_approved":
      return { subject: "You're approved as a Silicon Edge partner", title: "Welcome to the partner programme", lines: [`Congratulations ${name}! Your partner account is live${payload?.code ? ` and your referral code is <code>${payload.code}</code>` : ""}. Head to your dashboard to build links and track earnings.`], cta: { label: "Open partner dashboard", url: `${SITE}/partner` } };
    case "affiliate_declined":
      return { subject: "Update on your partner application", title: "Application update", lines: [`Hi ${name}, we're not able to approve your partner application at this time. You're welcome to reapply as your audience grows.`] };
    case "affiliate_course_approved": {
      const t = await courseTitle(payload?.course_id);
      return { subject: `Your link for ${t} is live`, title: "Course approved", lines: [`Hi ${name}, you're now approved to promote <strong>${t}</strong>${payload?.referral_code ? ` with code <code>${payload.referral_code}</code>` : ""}.`], cta: { label: "Get your link", url: `${SITE}/partner` } };
    }
    case "affiliate_conversion": {
      const t = await courseTitle(payload?.course_id);
      return { subject: "You earned a commission", title: "New conversion", lines: [`Nice work ${name} — someone bought <strong>${t}</strong> through your link. Commission earned: <strong>${money(payload?.commission)}</strong>.`], cta: { label: "See your earnings", url: `${SITE}/partner` } };
    }
    case "payout_requested":
      return { subject: "Payout request received", title: "We're on it", lines: [`Hi ${name}, we've received your payout request for <strong>${money(payload?.amount)}</strong>. You'll get another email once it's paid.`], cta: { label: "View payouts", url: `${SITE}/partner` } };
    case "payout_paid":
      return { subject: "Your payout has been sent", title: "Payout sent", lines: [`Hi ${name}, we've sent <strong>${money(payload?.amount)}</strong> to your payout account. Thanks for partnering with us.`], cta: { label: "View payouts", url: `${SITE}/partner` } };
    default:
      return null;
  }
}

function html(b: Built) {
  return brandEmail({
    title: b.title,
    preheader: b.subject,
    bodyHtml: b.lines
      .map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#1e293b">${l}</p>`)
      .join(""),
    cta: b.cta,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // ---- admin test send: { test_key, to } ----
    let body: any = null;
    try { body = await req.json(); } catch { /* cron posts no body */ }
    if (body?.test_key) {
      const to = String(body.to ?? "").trim();
      if (!to) {
        return new Response(JSON.stringify({ error: "Recipient email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const built = await build(String(body.test_key), body.payload ?? {}, "there");
      if (!built) {
        return new Response(JSON.stringify({ error: `Unknown automation: ${body.test_key}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({
          to,
          subject: `[Test] ${built.subject}`,
          html: html(built),
          category: "automation",
          template_key: body.test_key,
        }),
      });
      const detail = await res.text();
      return new Response(JSON.stringify({ test: true, ok: res.ok, detail }), {
        status: res.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Queue time-based automations (abandoned carts, inactivity, instalments, referral confirmation)
    try {
      await admin.rpc("queue_scheduled_automations");
    } catch (e) {
      console.error("[run-automations] scheduled queue failed", e);
    }

    const { data: events } = await admin
      .from("automation_events")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    let sent = 0, skipped = 0;
    for (const ev of events ?? []) {
      try {
        // automation can be switched off by admins via site_content
        const { data: flag } = await admin.from("site_content").select("value").eq("key", `automation_${ev.automation_key}`).maybeSingle();
        if (flag?.value === "off") {
          await admin.from("automation_events").update({ status: "skipped", processed_at: new Date().toISOString() }).eq("id", ev.id);
          skipped++;
          continue;
        }

        const { data: u } = await admin.auth.admin.getUserById(ev.user_id);
        const email = u?.user?.email;
        const { data: prof } = await admin.from("profiles").select("full_name").eq("user_id", ev.user_id).maybeSingle();
        const built = email ? await build(ev.automation_key, ev.payload, prof?.full_name?.split(" ")[0] ?? "there") : null;

        if (!built || !email) {
          await admin.from("automation_events").update({ status: "skipped", processed_at: new Date().toISOString() }).eq("id", ev.id);
          skipped++;
          continue;
        }

        await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            to: email,
            subject: built.subject,
            html: html(built),
            category: "automation",
            template_key: ev.automation_key,
            user_id: ev.user_id,
          }),
        });
        await admin.from("automation_events").update({ status: "sent", processed_at: new Date().toISOString() }).eq("id", ev.id);
        sent++;
      } catch (e) {
        console.error("[run-automations]", ev.id, e);
        await admin.from("automation_events").update({ status: "failed", error: String(e), processed_at: new Date().toISOString() }).eq("id", ev.id);
      }
    }

    await admin.from("site_content").upsert(
      { key: "automation_last_run", value: new Date().toISOString() },
      { onConflict: "key" },
    );

    return new Response(JSON.stringify({ processed: (events ?? []).length, sent, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[run-automations]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
