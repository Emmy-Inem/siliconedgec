// Paystack webhook receiver — verifies signature and updates enrollment
// reliably even if the user closes the browser before paystack-verify runs.
// Signed via HMAC SHA-512 with PAYSTACK_SECRET_KEY in `x-paystack-signature`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!PAYSTACK_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Paystack not configured" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  if (!sig || sig !== expected) {
    console.error("paystack-webhook: invalid signature");
    return new Response("invalid signature", { status: 401, headers: corsHeaders });
  }

  let evt: any;
  try { evt = JSON.parse(raw); } catch {
    return new Response("bad json", { status: 400, headers: corsHeaders });
  }

  // Always 200 OK to Paystack quickly; do real work asynchronously after.
  const respond = () => new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  if (evt?.event !== "charge.success") return respond();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const reference: string | undefined = evt.data?.reference;
  if (!reference) return respond();

  try {
    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, course_id, amount, status, metadata")
      .eq("reference", reference)
      .maybeSingle();

    if (!order) {
      console.warn("paystack-webhook: order not found", reference);
      return respond();
    }

    // Idempotent: skip if already completed.
    if (order.status !== "completed") {
      await supabase
        .from("orders")
        .update({ status: "completed", paystack_reference: evt.data?.reference })
        .eq("id", order.id);
    }

    // Cart orders may have multiple course_ids in metadata.items[].
    const items: any[] = Array.isArray((order.metadata as any)?.items)
      ? (order.metadata as any).items
      : [];
    const courseIds = items.length
      ? items.map((i) => i.course_id).filter(Boolean)
      : (order.course_id ? [order.course_id] : []);

    if (courseIds.length) {
      const rows = courseIds.map((cid: string) => ({
        user_id: order.user_id,
        course_id: cid,
        payment_status: "paid",
      }));
      await supabase
        .from("enrollments")
        .upsert(rows, { onConflict: "user_id,course_id" });
    }

    await supabase.from("admin_activity_log").insert({
      admin_user_id: order.user_id,
      entity_type: "order",
      entity_id: order.id,
      action: "webhook_charge_success",
      details: { reference, amount: Number(order.amount ?? 0) },
    }).then(() => {}, (e) => console.error("audit", e));
  } catch (e) {
    console.error("paystack-webhook handler error", e);
  }

  return respond();
});