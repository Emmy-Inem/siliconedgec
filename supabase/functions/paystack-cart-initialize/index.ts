// Initializes a single Paystack transaction for an entire cart of courses.
// Creates one pending order per course sharing a common reference.
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
      return new Response(
        JSON.stringify({ error: "Paystack is not configured. Add PAYSTACK_SECRET_KEY in secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

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

    const { course_ids, callback_url, utm } = await req.json();
    if (!Array.isArray(course_ids) || course_ids.length === 0) {
      return new Response(JSON.stringify({ error: "course_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: courses, error: coursesErr } = await supabase
      .from("courses")
      .select("id, title, price, discount_price, currency, is_published")
      .in("id", course_ids);
    if (coursesErr || !courses || courses.length === 0) {
      return new Response(JSON.stringify({ error: "Courses not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = courses.filter((c) => c.is_published);
    const total = valid.reduce((s, c) => s + Number(c.discount_price ?? c.price), 0);
    const reference = `SE-CART-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const currency = valid[0]?.currency ?? "NGN";

    // Create one pending order per course sharing the same reference (allows verification later)
    for (const c of valid) {
      const lineRef = `${reference}--${c.id.slice(0, 8)}`;
      await supabase.from("orders").insert({
        user_id: user.id,
        course_id: c.id,
        reference: lineRef,
        amount: Number(c.discount_price ?? c.price),
        currency,
        status: "pending",
        metadata: { cart_reference: reference, course_title: c.title, utm: utm ?? null },
      });
    }

    if (total === 0) {
      // Free cart: mark complete and enroll all
      for (const c of valid) {
        const lineRef = `${reference}--${c.id.slice(0, 8)}`;
        await supabase.from("orders").update({ status: "completed" }).eq("reference", lineRef);
        await supabase.from("enrollments").upsert(
          { user_id: user.id, course_id: c.id, payment_status: "paid" },
          { onConflict: "user_id,course_id" },
        );
      }
      return new Response(JSON.stringify({ free: true, reference, course_ids: valid.map((c) => c.id) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(total * 100),
        reference,
        currency,
        callback_url,
        metadata: { cart: true, user_id: user.id, course_ids: valid.map((c) => c.id) },
      }),
    });
    const psData = await psRes.json();
    if (!psData.status) {
      console.error("Paystack cart init failed", psData);
      return new Response(JSON.stringify({ error: psData.message ?? "Paystack init failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      authorization_url: psData.data.authorization_url,
      reference: psData.data.reference,
      total,
      currency,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("paystack-cart-initialize error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});