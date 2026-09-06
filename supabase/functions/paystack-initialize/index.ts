// Paystack payment initialization edge function
// Creates a transaction with Paystack and returns the authorization URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(
        JSON.stringify({
          error: "Paystack is not configured yet. Please add PAYSTACK_SECRET_KEY in your project secrets.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { course_id, promo_code_id, callback_url, utm, affiliate_code } = body;
    if (!course_id) {
      return new Response(JSON.stringify({ error: "course_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up course server-side (so client can't fake price)
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("id, title, price, discount_price, currency, is_published")
      .eq("id", course_id)
      .single();
    if (courseErr || !course || !course.is_published) {
      return new Response(JSON.stringify({ error: "Course not available" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basePrice = Number(course.discount_price ?? course.price);
    let discount = 0;

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
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (!expired && !usedUp) {
          discount = promo.discount_type === "percentage"
            ? Math.round((basePrice * Number(promo.discount_value)) / 100 * 100) / 100
            : Math.min(Number(promo.discount_value), basePrice);
        }
      }
    }

    const finalAmount = Math.max(0, basePrice - discount);
    const reference = `SE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Insert pending order
    const { error: orderErr } = await supabase.from("orders").insert({
      user_id: user.id,
      course_id,
      reference,
      amount: finalAmount,
      currency: course.currency ?? "NGN",
      status: "pending",
      promo_code_id: promo_code_id ?? null,
      discount_amount: discount,
      metadata: { course_title: course.title, utm: utm ?? null, affiliate_code: affiliate_code ?? null },
    });
    if (orderErr) throw orderErr;

    // If amount is 0 (100% promo), mark complete and skip Paystack
    if (finalAmount === 0) {
      await supabase.from("orders").update({ status: "completed" }).eq("reference", reference);
      await supabase.from("enrollments").upsert(
        { user_id: user.id, course_id, payment_status: "paid" },
        { onConflict: "user_id,course_id" },
      );
      return new Response(JSON.stringify({ free: true, reference }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Paystack transaction
    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(finalAmount * 100), // Paystack expects kobo
        reference,
        currency: course.currency ?? "NGN",
        callback_url,
        metadata: {
          course_id,
          user_id: user.id,
          course_title: course.title,
        },
      }),
    });

    const psData = await psRes.json();
    if (!psData.status) {
      console.error("Paystack init failed", psData);
      return new Response(JSON.stringify({ error: psData.message ?? "Paystack initialization failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      authorization_url: psData.data.authorization_url,
      reference: psData.data.reference,
      access_code: psData.data.access_code,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("paystack-initialize error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
