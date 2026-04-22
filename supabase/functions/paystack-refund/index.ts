// Paystack refund edge function. Calls Paystack's /refund API for an order
// and updates the order status to "refunded" on success. Admin-only.
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

    // Validate caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id, amount } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!order.paystack_reference && !order.reference) {
      return new Response(JSON.stringify({ error: "Order has no Paystack reference" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.status === "refunded") {
      return new Response(JSON.stringify({ ok: true, already: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Paystack refund. Amount in kobo (NGN minor units). Omit to refund full.
    const refundBody: Record<string, unknown> = {
      transaction: order.paystack_reference ?? order.reference,
    };
    if (typeof amount === "number" && amount > 0) {
      refundBody.amount = Math.round(amount * 100);
    }

    const psRes = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(refundBody),
    });
    const psData = await psRes.json();

    if (!psRes.ok || !psData.status) {
      console.error("Paystack refund failed", psData);
      return new Response(JSON.stringify({ error: psData.message ?? "Refund failed", details: psData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark order refunded and remove enrollment
    await supabase
      .from("orders")
      .update({
        status: "refunded",
        metadata: { ...(order.metadata ?? {}), refund: psData.data, refunded_by: user.id, refunded_at: new Date().toISOString() },
      })
      .eq("id", order_id);

    await supabase
      .from("enrollments")
      .delete()
      .eq("user_id", order.user_id)
      .eq("course_id", order.course_id);

    // Log admin action
    await supabase.from("admin_activity_log").insert({
      admin_user_id: user.id,
      entity_type: "order",
      entity_id: order_id,
      action: "refund",
      details: { paystack: psData.data, amount: amount ?? order.amount },
    });

    return new Response(JSON.stringify({ ok: true, refund: psData.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paystack-refund error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});