// Stripe payment verification edge function
// Verifies Stripe Checkout Session and activates course enrollment on success.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { safeErrorResponse } from "../_shared/errors.ts";
import { getStripeSecretKey, retrieveStripeCheckoutSession } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const stripeKey = await getStripeSecretKey(supabase);
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id, reference } = await req.json();
    if (!session_id && !reference) {
      return new Response(JSON.stringify({ error: "session_id or reference required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the order
    let query = supabase.from("orders").select("*");
    if (reference) {
      query = query.eq("reference", reference);
    } else if (session_id) {
      query = query.eq("stripe_session_id", session_id);
    }

    const { data: order, error: orderErr } = await query.maybeSingle();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetSessionId = session_id || order.stripe_session_id;
    if (!targetSessionId) {
      return new Response(JSON.stringify({ error: "No Stripe session ID associated with order" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify session with Stripe
    const session = await retrieveStripeCheckoutSession(targetSessionId, stripeKey);
    const isPaid = session.payment_status === "paid" || session.status === "complete";

    if (!isPaid) {
      await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
      return new Response(
        JSON.stringify({ verified: false, message: "Payment has not been completed." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if verification has already run idempotently
    const { data: priorVerify } = await supabase
      .from("admin_activity_log")
      .select("id")
      .eq("entity_type", "order")
      .eq("entity_id", order.id)
      .eq("action", "verify")
      .limit(1)
      .maybeSingle();

    const alreadyCompleted = !!priorVerify;

    // Update order status
    if (order.status !== "completed") {
      await supabase
        .from("orders")
        .update({
          status: "completed",
          stripe_session_id: session.id,
          payment_gateway: "stripe",
        })
        .eq("id", order.id);
    }

    // Activate enrollment
    await supabase.from("enrollments").upsert(
      { user_id: order.user_id, course_id: order.course_id, payment_status: "paid" },
      { onConflict: "user_id,course_id" }
    );

    if (alreadyCompleted) {
      return new Response(JSON.stringify({ verified: true, course_id: order.course_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert audit log
    try {
      await supabase.from("admin_activity_log").insert({
        admin_user_id: order.user_id,
        entity_type: "order",
        entity_id: order.id,
        action: "verify",
        details: {
          channel: "stripe",
          checkout_type: "single",
          reference: order.reference,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          amount: Number(order.amount ?? 0),
          currency: order.currency,
          customer_email: session.customer_email,
        },
      });
    } catch (e) {
      console.error("Stripe audit insert failed", e);
    }

    // Fire enrollment confirmation email (best effort)
    try {
      const [{ data: courseRow }, { data: profileRow }, { data: { user: userRow } }] = await Promise.all([
        supabase.from("courses").select("title").eq("id", order.course_id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("user_id", order.user_id).maybeSingle(),
        supabase.auth.admin.getUserById(order.user_id),
      ]);
      const recipient = userRow?.email;
      if (recipient) {
        const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${anon}` },
          body: JSON.stringify({
            template_key: "tpl_enrollment",
            to: recipient,
            variables: {
              name: profileRow?.full_name || recipient.split("@")[0],
              course_title: courseRow?.title ?? "your course",
              course_url: `https://siliconedgec.com/courses/${order.course_id}/learn`,
            },
          }),
        }).catch((e) => console.error("Enrollment email send failed:", e));
      }
    } catch (e) {
      console.error("Email lookup failed:", e);
    }

    // Influencer / Referral commission attribution
    try {
      const orderUtm = (order.metadata && (order.metadata as any).utm) || {};
      let promoIdForReferral: string | null = order.promo_code_id ?? null;
      let promoForCommission: any = null;

      if (promoIdForReferral) {
        const { data } = await supabase
          .from("promo_codes")
          .select("id, commission_percentage")
          .eq("id", promoIdForReferral)
          .maybeSingle();
        promoForCommission = data;
      } else if (orderUtm.utm_campaign || orderUtm.utm_source) {
        let promoRow: any = null;
        if (orderUtm.utm_campaign) {
          const { data } = await supabase
            .from("promo_codes")
            .select("id, commission_percentage")
            .ilike("code", orderUtm.utm_campaign)
            .eq("is_active", true)
            .maybeSingle();
          promoRow = data;
        }
        if (!promoRow && orderUtm.utm_source) {
          const { data } = await supabase
            .from("promo_codes")
            .select("id, commission_percentage")
            .ilike("slug", orderUtm.utm_source)
            .eq("is_active", true)
            .maybeSingle();
          promoRow = data;
        }
        if (promoRow) {
          promoIdForReferral = promoRow.id;
          promoForCommission = promoRow;
        }
      }

      if (promoIdForReferral || orderUtm.utm_source || orderUtm.utm_campaign) {
        const commissionPct = Number(promoForCommission?.commission_percentage ?? 0);
        const commission = (Number(order.amount) * commissionPct) / 100;
        await supabase.from("influencer_referrals").upsert(
          {
            promo_code_id: promoIdForReferral,
            user_id: order.user_id,
            course_id: order.course_id,
            conversion_type: "paid_enrollment",
            order_id: order.id,
            original_price: Number(order.amount) + Number(order.discount_amount ?? 0),
            discount_applied: Number(order.discount_amount ?? 0),
            final_price: Number(order.amount),
            commission_earned: commission,
            utm_source: orderUtm.utm_source ?? null,
            utm_medium: orderUtm.utm_medium ?? null,
            utm_campaign: orderUtm.utm_campaign ?? null,
            utm_content: orderUtm.utm_content ?? null,
          },
          { onConflict: "order_id" }
        );
      }
    } catch (e) {
      console.error("Influencer attribution failed:", e);
    }

    return new Response(JSON.stringify({ verified: true, course_id: order.course_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return safeErrorResponse(err, 500, corsHeaders, "Failed to verify Stripe payment");
  }
});
