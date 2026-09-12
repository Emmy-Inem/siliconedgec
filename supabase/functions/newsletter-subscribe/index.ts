// Public newsletter signup with double opt-in.
// Creates (or revives) a pending subscriber and emails a branded confirmation link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { brandEmail, textToHtml, BRAND } from "../_shared/brand-email.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { safeErrorResponse } from "../_shared/errors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Rate limit: max 5 newsletter subscription requests per minute per IP
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({
      key: `newsletter:${clientIp}`,
      limit: 5,
      windowMs: 60 * 1000,
    });

    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfter, corsHeaders);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const fullName = body?.full_name ? String(body.full_name).slice(0, 120) : null;
    const source = String(body?.source ?? "footer").slice(0, 40);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "Enter a valid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await admin
      .from("newsletter_subscribers")
      .select("id, status, confirm_token")
      .eq("email", email)
      .maybeSingle();

    let confirmToken = existing?.confirm_token as string | undefined;

    if (!existing) {
      const { data: inserted, error } = await admin
        .from("newsletter_subscribers")
        .insert({ email, full_name: fullName, source, status: "pending" })
        .select("confirm_token")
        .single();
      if (error) throw error;
      confirmToken = inserted.confirm_token as string;
    } else if (existing.status === "subscribed") {
      return new Response(JSON.stringify({ ok: true, already: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      await admin
        .from("newsletter_subscribers")
        .update({ status: "pending", full_name: fullName ?? undefined, source })
        .eq("id", existing.id);
    }

    const confirmUrl = `${BRAND.site}/newsletter/confirm?token=${confirmToken}`;
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({
        to: email,
        subject: "Confirm your Silicon Edge newsletter subscription",
        html: brandEmail({
          title: "Confirm your subscription",
          preheader: "One click and you're on the list.",
          bodyHtml: textToHtml(
            "Thanks for signing up for the Silicon Edge Consulting newsletter — career tips, new cohorts, and job-ready training updates in AI, Cloud and DevOps.\n\nConfirm your email address to start receiving it.",
          ),
          cta: { label: "Confirm subscription", url: confirmUrl },
          footerNote: "If you didn't request this, you can safely ignore this email.",
        }),
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return safeErrorResponse(e, 500, corsHeaders, "Failed to process subscription");
  }
});