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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const ok = () => new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  // 5xx so Paystack auto-retries this delivery later.
  const retry = (msg: string) => new Response(JSON.stringify({ error: msg }), {
    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  const reference: string | undefined = evt?.data?.reference;
  const eventId: string | null =
    evt?.id?.toString?.() ??
    (reference ? `${evt?.event ?? "evt"}:${reference}` : null);

  // 1) Log every webhook delivery. Unique (provider, event_id) gives us
  //    idempotent dedup even if Paystack retries the same event.
  let logRow: { id: string; status: string; attempts: number } | null = null;
  if (eventId) {
    const { data: existing } = await supabase
      .from("webhook_events")
      .select("id, status, attempts")
      .eq("provider", "paystack")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing) {
      // Already succeeded — drop the duplicate silently.
      if (existing.status === "success") return ok();
      await supabase
        .from("webhook_events")
        .update({ attempts: (existing.attempts ?? 0) + 1, status: "pending" })
        .eq("id", existing.id);
      logRow = { ...existing, attempts: (existing.attempts ?? 0) + 1, status: "pending" };
    } else {
      const { data: inserted } = await supabase
        .from("webhook_events")
        .insert({
          provider: "paystack",
          event_id: eventId,
          event_type: evt?.event ?? null,
          reference: reference ?? null,
          status: "pending",
          attempts: 1,
          payload: evt,
        })
        .select("id, status, attempts")
        .single();
      logRow = inserted ?? null;
    }
  }

  const markFailed = async (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (logRow) {
      await supabase
        .from("webhook_events")
        .update({ status: "failed", last_error: msg.slice(0, 1000) })
        .eq("id", logRow.id);
    }
    console.error("paystack-webhook handler error", msg);
  };
  const markSuccess = async () => {
    if (logRow) {
      await supabase
        .from("webhook_events")
        .update({ status: "success", processed_at: new Date().toISOString(), last_error: null })
        .eq("id", logRow.id);
    }
  };

  // Only `charge.success` triggers enrollment work; everything else is logged
  // but acknowledged so Paystack doesn't retry useless events.
  if (evt?.event !== "charge.success") {
    await markSuccess();
    return ok();
  }
  if (!reference) {
    await markFailed(new Error("missing reference"));
    return ok();
  }

  try {
    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, course_id, amount, status, metadata")
      .eq("reference", reference)
      .maybeSingle();

    if (!order) {
      // Order may not be persisted yet on the very first delivery — ask
      // Paystack to retry so we don't lose the enrollment.
      await markFailed(new Error("order not found for reference " + reference));
      return retry("order not found yet");
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
      // upsert on (user_id, course_id) makes this safe to replay — no
      // duplicate enrollments are created on webhook retries.
      const { error: enrollErr } = await supabase
        .from("enrollments")
        .upsert(rows, { onConflict: "user_id,course_id" });
      if (enrollErr) throw enrollErr;
    }

    await supabase.from("admin_activity_log").insert({
      admin_user_id: order.user_id,
      entity_type: "order",
      entity_id: order.id,
      action: "webhook_charge_success",
      details: { reference, amount: Number(order.amount ?? 0) },
    }).then(() => {}, (e) => console.error("audit", e));

    await markSuccess();
    return ok();
  } catch (e) {
    await markFailed(e);
    // 5xx so Paystack retries this delivery.
    return retry(e instanceof Error ? e.message : "unknown error");
  }
});