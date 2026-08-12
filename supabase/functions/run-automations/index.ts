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

    return new Response(JSON.stringify({ processed: (events ?? []).length, sent, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[run-automations]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
