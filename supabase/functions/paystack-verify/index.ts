// Paystack payment verification edge function
// Verifies a transaction reference with Paystack and creates enrollment on success.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Paystack not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Paystack
    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const psData = await psRes.json();

    if (!psData.status || psData.data?.status !== "success") {
      await supabase.from("orders").update({ status: "failed" }).eq("reference", reference);
      return new Response(JSON.stringify({ verified: false, message: psData.data?.gateway_response ?? "Payment failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the order
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("reference", reference)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order
    await supabase
      .from("orders")
      .update({
        status: "completed",
        paystack_reference: psData.data.reference,
      })
      .eq("reference", reference);

    // Create enrollment
    await supabase.from("enrollments").upsert(
      { user_id: order.user_id, course_id: order.course_id, payment_status: "paid" },
      { onConflict: "user_id,course_id" },
    );

    // Update promo code usage if applicable
    if (order.promo_code_id) {
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("usage_count, revenue_generated, commission_percentage")
        .eq("id", order.promo_code_id)
        .single();
      if (promo) {
        const commission = (Number(order.amount) * Number(promo.commission_percentage ?? 0)) / 100;
        await supabase
          .from("promo_codes")
          .update({
            usage_count: (promo.usage_count ?? 0) + 1,
            revenue_generated: Number(promo.revenue_generated ?? 0) + Number(order.amount),
          })
          .eq("id", order.promo_code_id);

        await supabase.from("influencer_referrals").insert({
          promo_code_id: order.promo_code_id,
          user_id: order.user_id,
          course_id: order.course_id,
          original_price: Number(order.amount) + Number(order.discount_amount ?? 0),
          discount_applied: Number(order.discount_amount ?? 0),
          final_price: Number(order.amount),
          commission_earned: commission,
        });
      }
    }

    return new Response(JSON.stringify({ verified: true, course_id: order.course_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paystack-verify error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
