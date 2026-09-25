// Verifies a cart-level Stripe transaction and enrolls the user in all courses.
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

    // Look up line orders by cart reference or stripe_session_id
    let query = supabase.from("orders").select("*");
    if (reference) {
      query = query.like("reference", `${reference}--%`);
    } else if (session_id) {
      query = query.eq("stripe_session_id", session_id);
    }

    const { data: orders, error: ordersErr } = await query;
    if (ordersErr || !orders || orders.length === 0) {
      return new Response(JSON.stringify({ error: "No orders found for reference" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetSessionId = session_id || orders[0].stripe_session_id;
    if (!targetSessionId) {
      return new Response(JSON.stringify({ error: "Stripe session ID missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await retrieveStripeCheckoutSession(targetSessionId, stripeKey);
    const isPaid = session.payment_status === "paid" || session.status === "complete";

    if (!isPaid) {
      const orderIds = orders.map((o: any) => o.id);
      await supabase.from("orders").update({ status: "failed" }).in("id", orderIds);
      return new Response(
        JSON.stringify({ verified: false, message: "Payment has not been completed." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = orders[0].user_id;
    const courseIds: string[] = [];
    for (const o of orders) {
      if (o.status !== "completed") {
        await supabase
          .from("orders")
          .update({
            status: "completed",
            stripe_session_id: session.id,
            payment_gateway: "stripe",
          })
          .eq("id", o.id);
      }
      await supabase.from("enrollments").upsert(
        { user_id: o.user_id, course_id: o.course_id, payment_status: "paid" },
        { onConflict: "user_id,course_id" }
      );
      courseIds.push(o.course_id);
    }

    // Clear cart items for purchased courses
    await supabase.from("cart_items").delete().eq("user_id", userId).in("course_id", courseIds);

    // Check idempotency via audit log
    const { data: priorVerify } = await supabase
      .from("admin_activity_log")
      .select("id")
      .eq("entity_type", "order")
      .eq("action", "verify")
      .in("entity_id", orders.map((o: any) => o.id))
      .limit(1);

    const alreadyCompleted = (priorVerify?.length ?? 0) > 0;
    const totalAmount = orders.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
    const cartRef = reference || (orders[0].metadata as any)?.cart_reference || orders[0].reference;

    if (alreadyCompleted) {
      return new Response(
        JSON.stringify({
          verified: true,
          course_ids: courseIds,
          total: totalAmount,
          currency: "USD",
          reference: cartRef,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert audit log
    try {
      await supabase.from("admin_activity_log").insert({
        admin_user_id: userId,
        entity_type: "order",
        entity_id: orders[0].id,
        action: "verify",
        details: {
          channel: "stripe",
          checkout_type: "cart",
          reference: cartRef,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          total: totalAmount,
          currency: "USD",
          courses_count: courseIds.length,
        },
      });
    } catch (e) {
      console.error("Cart audit insert failed:", e);
    }

    // Influencer attribution per line item
    for (const o of orders) {
      try {
        const orderUtm = (o.metadata && (o.metadata as any).utm) || {};
        let promoIdForReferral: string | null = o.promo_code_id ?? null;
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
          const commission = (Number(o.amount) * commissionPct) / 100;
          await supabase.from("influencer_referrals").upsert(
            {
              promo_code_id: promoIdForReferral,
              user_id: o.user_id,
              course_id: o.course_id,
              conversion_type: "paid_enrollment",
              order_id: o.id,
              original_price: Number(o.amount) + Number(o.discount_amount ?? 0),
              discount_applied: Number(o.discount_amount ?? 0),
              final_price: Number(o.amount),
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
        console.error("Cart line attribution failed:", e);
      }
    }

    return new Response(
      JSON.stringify({
        verified: true,
        course_ids: courseIds,
        total: totalAmount,
        currency: "USD",
        reference: cartRef,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return safeErrorResponse(err, 500, corsHeaders, "Failed to verify Stripe cart payment");
  }
});
