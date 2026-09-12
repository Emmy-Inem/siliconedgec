// Admin-only newsletter sender. Resolves an audience, previews recipient counts,
// and sends the branded newsletter with a one-click unsubscribe link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { brandEmail, textToHtml, BRAND } from "../_shared/brand-email.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { maskEmail, safeErrorResponse } from "../_shared/errors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

type Recipient = { email: string; name?: string | null; unsubscribeToken?: string | null };

async function emailsForUserIds(ids: string[]): Promise<Recipient[]> {
  const unique = [...new Set(ids)].slice(0, 5000);
  const out: Recipient[] = [];
  for (const id of unique) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) out.push({ email: data.user.email });
  }
  return out;
}

async function resolveAudience(audience: string, opts: { group?: string; courseId?: string; email?: string }) {
  if (audience === "single" && opts.email) return [{ email: opts.email.toLowerCase() }];

  if (audience === "subscribers" || audience === "group") {
    let q = admin
      .from("newsletter_subscribers")
      .select("email, full_name, unsubscribe_token")
      .eq("status", "subscribed");
    if (audience === "group" && opts.group) q = q.contains("groups", [opts.group]);
    const { data } = await q;
    return (data ?? []).map((r: any) => ({
      email: r.email,
      name: r.full_name,
      unsubscribeToken: r.unsubscribe_token,
    }));
  }

  if (audience === "course" && opts.courseId) {
    const { data } = await admin.from("enrollments").select("user_id").eq("course_id", opts.courseId);
    return emailsForUserIds((data ?? []).map((r: any) => r.user_id));
  }

  if (audience === "paid") {
    const { data } = await admin.from("enrollments").select("user_id").eq("payment_status", "paid");
    return emailsForUserIds((data ?? []).map((r: any) => r.user_id));
  }

  if (audience === "partners") {
    const { data } = await admin.from("affiliates").select("email").eq("status", "approved");
    return (data ?? []).filter((r: any) => r.email).map((r: any) => ({ email: r.email }));
  }

  if (audience === "all_users") {
    const { data } = await admin.from("profiles").select("user_id");
    return emailsForUserIds((data ?? []).map((r: any) => r.user_id));
  }

  return [];
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Auth: must be a signed-in admin
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const { data: userData } = await admin.auth.getUser(token);
    const uid = userData?.user?.id;
    if (!uid) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Admins only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const {
      preview = false,
      test = false,
      test_email,
      campaign_id,
      subject,
      body: content,
      audience = "subscribers",
      group_name,
      course_id,
      target_email,
    } = body ?? {};

    const recipients = test
      ? [{ email: String(test_email ?? userData!.user!.email) }]
      : await resolveAudience(audience, { group: group_name, courseId: course_id, email: target_email });

    if (preview) {
      return new Response(
        JSON.stringify({ recipients: recipients.length, sample: recipients.slice(0, 5).map((r) => r.email) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!subject || !content) {
      return new Response(JSON.stringify({ error: "Subject and body are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;
    let failed = 0;
    for (const r of recipients) {
      const unsubscribeUrl = r.unsubscribeToken
        ? `${BRAND.site}/newsletter/unsubscribe?token=${r.unsubscribeToken}`
        : undefined;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            to: r.email,
            category: "newsletter",
            campaign_id: campaign_id ?? null,
            template_key: test ? "newsletter_test" : "newsletter",
            subject,
            html: brandEmail({
              title: subject,
              preheader: String(content).slice(0, 120),
              bodyHtml: textToHtml(String(content).replace(/\{\{name\}\}/g, r.name ?? "there")),
              unsubscribeUrl,
              footerNote: "You're receiving this because you subscribed to Silicon Edge Consulting updates.",
            }),
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        sent++;
      } catch (e) {
        console.error("[newsletter-send] failed", maskEmail(r.email), e);
        failed++;
      }
    }

    if (campaign_id && !test) {
      await admin
        .from("newsletter_campaigns")
        .update({
          status: "sent",
          recipient_count: recipients.length,
          sent_count: sent,
          failed_count: failed,
          sent_at: new Date().toISOString(),
          sent_by: uid,
        })
        .eq("id", campaign_id);
    }

    return new Response(JSON.stringify({ ok: true, recipients: recipients.length, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return safeErrorResponse(e, 500, corsHeaders, "Failed to send newsletter campaign");
  }
});