// Stripe payment initialization edge function
// Creates a hosted Stripe Checkout session for a course enrollment.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { safeErrorResponse } from "../_shared/errors.ts";
import { getStripeSecretKey, getNgnToUsdRate, createStripeCheckoutSession } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve Stripe Secret Key
    const stripeKey = await getStripeSecretKey(supabase);
    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error: "Stripe payments are not configured yet. Please check back shortly or contact support.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { course_id, promo_code_id, callback_url, cancel_url, utm, affiliate_code } = body;
    if (!course_id) {
      return new Response(JSON.stringify({ error: "course_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up course server-side to prevent client tampering
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("id, title, price, discount_price, currency, is_published")
      .eq("id", course_id)
      .single();

    if (courseErr || !course || !course.is_published) {
      return new Response(JSON.stringify({ error: "Course not available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseNgnPrice = Number(course.discount_price ?? course.price);
    let discountNgn = 0;

    // Apply promo if provided
    if (promo_code_id) {
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("id, discount_type, discount_value, is_active, expires_at, max_uses, usage_count, course_ids")
        .eq("id", promo_code_id)
        .eq("is_active", true)
        .maybeSingle();

      if (promo) {
        const expired = promo.expires_at && new Date(promo.expires_at) < new Date();
        const usedUp = promo.max_uses && promo.usage_count >= promo.max_uses;
        const scoped = Array.isArray((promo as any).course_ids) && (promo as any).course_ids.length > 0;
        const inScope = !scoped || (promo as any).course_ids.includes(course_id);

        if (!inScope) {
          return new Response(
            JSON.stringify({ error: "This promo code is not valid for this course." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!expired && !usedUp) {
          discountNgn =
            promo.discount_type === "percentage"
              ? Math.round(((baseNgnPrice * Number(promo.discount_value)) / 100) * 100) / 100
              : Math.min(Number(promo.discount_value), baseNgnPrice);
        }
      }
    }

    const finalNgnAmount = Math.max(0, baseNgnPrice - discountNgn);
    const reference = `SE-STRIPE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // If course is 100% free with promo
    if (finalNgnAmount === 0) {
      await supabase.from("orders").insert({
        user_id: user.id,
        course_id,
        reference,
        amount: 0,
        currency: "USD",
        status: "completed",
        promo_code_id: promo_code_id ?? null,
        discount_amount: discountNgn,
        payment_gateway: "stripe",
        metadata: {
          course_title: course.title,
          gateway: "stripe",
          free: true,
          utm: utm ?? null,
          affiliate_code: affiliate_code ?? null,
        },
      });

      await supabase.from("enrollments").upsert(
        { user_id: user.id, course_id, payment_status: "paid" },
        { onConflict: "user_id,course_id" }
      );

      return new Response(JSON.stringify({ free: true, reference }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert NGN amount to USD
    const fxRate = await getNgnToUsdRate();
    const usdAmount = Math.round(finalNgnAmount * fxRate * 100) / 100;
    const usdAmountCents = Math.round(usdAmount * 100);

    // Insert pending order
    const { error: orderErr } = await supabase.from("orders").insert({
      user_id: user.id,
      course_id,
      reference,
      amount: usdAmount,
      currency: "USD",
      status: "pending",
      promo_code_id: promo_code_id ?? null,
      discount_amount: Math.round(discountNgn * fxRate * 100) / 100,
      payment_gateway: "stripe",
      metadata: {
        course_title: course.title,
        gateway: "stripe",
        original_ngn_amount: finalNgnAmount,
        fx_rate: fxRate,
        utm: utm ?? null,
        affiliate_code: affiliate_code ?? null,
      },
    });

    if (orderErr) throw orderErr;

    // Create Stripe checkout session
    const resolvedCallbackUrl = callback_url || `https://siliconedgec.com/courses/${course_id}?verify=1`;
    const successUrl = `${resolvedCallbackUrl}${resolvedCallbackUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}&reference=${encodeURIComponent(reference)}&stripe=1`;
    const resolvedCancelUrl = cancel_url || resolvedCallbackUrl.replace("verify=1", "cancelled=1");

    const session = await createStripeCheckoutSession({
      secretKey: stripeKey,
      customerEmail: user.email || "",
      clientReferenceId: reference,
      lineItems: [
        {
          name: course.title,
          description: "Silicon Edge Consulting Course Enrollment",
          unitAmountCents: usdAmountCents,
          quantity: 1,
        },
      ],
      successUrl,
      cancelUrl: resolvedCancelUrl,
      metadata: {
        reference,
        user_id: user.id,
        course_id,
      },
    });

    // Update order with stripe_session_id
    await supabase.from("orders").update({ stripe_session_id: session.id }).eq("reference", reference);

    return new Response(
      JSON.stringify({
        authorization_url: session.url,
        session_id: session.id,
        reference,
        amount_usd: usdAmount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return safeErrorResponse(err, 500, corsHeaders, "Failed to initialize Stripe checkout. Please try again.");
  }
});
