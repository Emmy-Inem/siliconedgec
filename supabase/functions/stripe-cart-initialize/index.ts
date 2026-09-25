// Initializes a single Stripe Checkout session for an entire cart of courses.
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

    const stripeKey = await getStripeSecretKey(supabase);
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe payments are not configured yet." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { course_ids, callback_url, cancel_url, utm, promo_code_id, affiliate_code } = await req.json();
    if (!Array.isArray(course_ids) || course_ids.length === 0) {
      return new Response(JSON.stringify({ error: "course_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: courses, error: coursesErr } = await supabase
      .from("courses")
      .select("id, title, price, discount_price, currency, is_published")
      .in("id", course_ids);

    if (coursesErr || !courses || courses.length === 0) {
      return new Response(JSON.stringify({ error: "Courses not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = courses.filter((c) => c.is_published);
    const subtotalNgn = valid.reduce((s, c) => s + Number(c.discount_price ?? c.price), 0);

    // Apply promo if provided
    let discountNgn = 0;
    let validPromoId: string | null = null;
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
        const cartIds = valid.map((c) => c.id);
        const allInScope = !scoped || cartIds.every((id) => (promo as any).course_ids.includes(id));

        if (!allInScope) {
          return new Response(
            JSON.stringify({ error: "This promo code does not apply to one or more courses in your cart." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!expired && !usedUp) {
          discountNgn =
            promo.discount_type === "percentage"
              ? Math.round(((subtotalNgn * Number(promo.discount_value)) / 100) * 100) / 100
              : Math.min(Number(promo.discount_value), subtotalNgn);
          validPromoId = promo.id;
        }
      }
    }

    const fxRate = await getNgnToUsdRate();
    const reference = `SE-CART-STRIPE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Free cart handling (100% discount)
    const finalTotalNgn = Math.max(0, subtotalNgn - discountNgn);
    if (finalTotalNgn === 0) {
      for (const c of valid) {
        const lineRef = `${reference}--${c.id.slice(0, 8)}`;
        await supabase.from("orders").insert({
          user_id: user.id,
          course_id: c.id,
          reference: lineRef,
          amount: 0,
          currency: "USD",
          status: "completed",
          promo_code_id: validPromoId,
          discount_amount: Math.round(Number(c.discount_price ?? c.price) * fxRate * 100) / 100,
          payment_gateway: "stripe",
          metadata: {
            cart_reference: reference,
            course_title: c.title,
            gateway: "stripe",
            free: true,
            utm: utm ?? null,
            affiliate_code: affiliate_code ?? null,
          },
        });
        await supabase.from("enrollments").upsert(
          { user_id: user.id, course_id: c.id, payment_status: "paid" },
          { onConflict: "user_id,course_id" }
        );
      }

      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
        .in("course_id", valid.map((c) => c.id));

      return new Response(
        JSON.stringify({ free: true, reference, course_ids: valid.map((c) => c.id) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Distribute discount proportionally across courses & create pending line orders
    const stripeLineItems = [];
    let totalUsdAmount = 0;

    for (const c of valid) {
      const lineRef = `${reference}--${c.id.slice(0, 8)}`;
      const lineSubtotalNgn = Number(c.discount_price ?? c.price);
      const lineDiscountNgn = subtotalNgn > 0 ? Math.round(((lineSubtotalNgn / subtotalNgn) * discountNgn) * 100) / 100 : 0;
      const lineFinalNgn = Math.max(0, lineSubtotalNgn - lineDiscountNgn);

      const lineUsdAmount = Math.max(0.5, Math.round(lineFinalNgn * fxRate * 100) / 100);
      const lineDiscountUsd = Math.round(lineDiscountNgn * fxRate * 100) / 100;
      totalUsdAmount += lineUsdAmount;

      await supabase.from("orders").insert({
        user_id: user.id,
        course_id: c.id,
        reference: lineRef,
        amount: lineUsdAmount,
        currency: "USD",
        status: "pending",
        promo_code_id: validPromoId,
        discount_amount: lineDiscountUsd,
        payment_gateway: "stripe",
        metadata: {
          cart_reference: reference,
          course_title: c.title,
          gateway: "stripe",
          fx_rate: fxRate,
          utm: utm ?? null,
          affiliate_code: affiliate_code ?? null,
        },
      });

      stripeLineItems.push({
        name: c.title,
        description: "Course Enrollment",
        unitAmountCents: Math.round(lineUsdAmount * 100),
        quantity: 1,
      });
    }

    const resolvedCallbackUrl = callback_url || `https://siliconedgec.com/cart`;
    const successUrl = `${resolvedCallbackUrl}${resolvedCallbackUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}&reference=${encodeURIComponent(reference)}&stripe=1`;
    const resolvedCancelUrl = cancel_url || resolvedCallbackUrl;

    const session = await createStripeCheckoutSession({
      secretKey: stripeKey,
      customerEmail: user.email || "",
      clientReferenceId: reference,
      lineItems: stripeLineItems,
      successUrl,
      cancelUrl: resolvedCancelUrl,
      metadata: {
        cart: "true",
        cart_reference: reference,
        user_id: user.id,
        course_ids: valid.map((c) => c.id).join(","),
      },
    });

    // Update all line orders with stripe_session_id
    await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .like("reference", `${reference}--%`);

    return new Response(
      JSON.stringify({
        authorization_url: session.url,
        session_id: session.id,
        reference,
        total: Math.round(totalUsdAmount * 100) / 100,
        currency: "USD",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return safeErrorResponse(err, 500, corsHeaders, "Failed to initialize Stripe cart checkout");
  }
});
