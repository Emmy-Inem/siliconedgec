// Stripe webhook receiver — ensures enrollment is fulfilled even if user closes window before redirect
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
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

    const payload = await req.json();
    const eventType = payload?.type;

    if (eventType === "checkout.session.completed") {
      const sessionObj = payload?.data?.object;
      const sessionId = sessionObj?.id;

      if (sessionId) {
        // Re-verify directly with Stripe API to ensure event payload authenticity
        const verifiedSession = await retrieveStripeCheckoutSession(sessionId, stripeKey);
        const isPaid = verifiedSession.payment_status === "paid" || verifiedSession.status === "complete";

        if (isPaid) {
          const clientRef = verifiedSession.client_reference_id;
          const isCart = verifiedSession.metadata?.cart === "true" || clientRef?.startsWith("SE-CART-");

          if (isCart) {
            const { data: orders } = await supabase
              .from("orders")
              .select("*")
              .or(`stripe_session_id.eq.${sessionId},reference.like.${clientRef}--%`);

            if (orders && orders.length > 0) {
              const courseIds: string[] = [];
              for (const o of orders) {
                if (o.status !== "completed") {
                  await supabase.from("orders").update({
                    status: "completed",
                    payment_gateway: "stripe",
                    stripe_session_id: sessionId,
                  }).eq("id", o.id);
                }
                await supabase.from("enrollments").upsert(
                  { user_id: o.user_id, course_id: o.course_id, payment_status: "paid" },
                  { onConflict: "user_id,course_id" }
                );
                courseIds.push(o.course_id);
              }
              await supabase.from("cart_items").delete().eq("user_id", orders[0].user_id).in("course_id", courseIds);
            }
          } else {
            const { data: order } = await supabase
              .from("orders")
              .select("*")
              .or(`stripe_session_id.eq.${sessionId},reference.eq.${clientRef}`)
              .maybeSingle();

            if (order) {
              if (order.status !== "completed") {
                await supabase.from("orders").update({
                  status: "completed",
                  payment_gateway: "stripe",
                  stripe_session_id: sessionId,
                }).eq("id", order.id);
              }
              await supabase.from("enrollments").upsert(
                { user_id: order.user_id, course_id: order.course_id, payment_status: "paid" },
                { onConflict: "user_id,course_id" }
              );
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Stripe Webhook Error]:", err);
    return new Response(JSON.stringify({ error: "Webhook processing error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
