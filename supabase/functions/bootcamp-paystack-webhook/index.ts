// Paystack webhook for bootcamp installment payments.
// HMAC-SHA512 verified, idempotent via bootcamp_payment_events.paystack_event_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  const SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!SECRET) return new Response("not configured", { status: 503, headers: corsHeaders });

  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", SECRET).update(raw).digest("hex");
  if (!sig || sig !== expected) {
    return new Response("invalid signature", { status: 401, headers: corsHeaders });
  }

  let evt: any;
  try { evt = JSON.parse(raw); } catch {
    return new Response("bad json", { status: 400, headers: corsHeaders });
  }

  if (evt?.event !== "charge.success") {
    return new Response("ignored", { status: 200, headers: corsHeaders });
  }

  const data = evt.data ?? {};
  const metadata = data.metadata ?? {};
  // Only handle our bootcamp installment events; other Paystack pages go to the
  // existing /paystack-webhook handler.
  if (metadata?.kind !== "bootcamp_installment") {
    return new Response("ignored", { status: 200, headers: corsHeaders });
  }

  const reference: string | null = metadata?.reference ?? null;
  const eventId: string = String(data?.id ?? `${data?.reference ?? "evt"}`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Idempotency
  const { data: existing } = await supabase
    .from("bootcamp_payment_events")
    .select("id")
    .eq("paystack_event_id", eventId)
    .maybeSingle();
  if (existing) return new Response("already processed", { status: 200, headers: corsHeaders });

  // Locate enrollment by metadata.reference, falling back to email + cohort.
  let enrollment: any = null;
  if (reference) {
    const { data } = await supabase
      .from("bootcamp_enrollments")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();
    enrollment = data;
  }
  if (!enrollment && metadata?.email && metadata?.cohort_id) {
    const { data } = await supabase
      .from("bootcamp_enrollments")
      .select("*")
      .eq("cohort_id", metadata.cohort_id)
      .eq("email", String(metadata.email).toLowerCase())
      .maybeSingle();
    enrollment = data;
  }
  if (!enrollment) {
    // Retry later — Paystack will replay.
    return new Response("enrollment not found", { status: 500, headers: corsHeaders });
  }

  const chargedAmount = Number(data?.amount ?? 0) / 100;
  const newAmountPaid = Number(enrollment.amount_paid ?? 0) + chargedAmount;
  const totalAmount = Number(enrollment.total_amount ?? 0);
  const dueDates: string[] = enrollment.installment_due_dates ?? [];

  let paid: number;
  let isComplete: boolean;
  let nextDue: string | null;

  if (enrollment.flexible_payment) {
    // Flexible: complete once cumulative payments reach total.
    isComplete = totalAmount > 0 && newAmountPaid + 0.5 >= totalAmount;
    paid = enrollment.installments_paid + 1;
    nextDue = isComplete ? null : (enrollment.final_due_date ?? enrollment.next_due_date ?? null);
  } else {
    paid = (enrollment.installments_paid ?? 0) + 1;
    isComplete = paid >= enrollment.total_installments;
    nextDue = isComplete ? null : (dueDates[paid] ?? null);
  }

  await supabase.from("bootcamp_enrollments").update({
    installments_paid: paid,
    amount_paid: newAmountPaid,
    next_due_date: nextDue,
    status: isComplete ? "completed" : "active",
    access_granted: true,
    last_payment_date: new Date().toISOString(),
  }).eq("id", enrollment.id);

  await supabase.from("bootcamp_payment_events").insert({
    enrollment_id: enrollment.id,
    paystack_event_id: eventId,
    paystack_reference: data?.reference ?? null,
    amount: Number(data?.amount ?? 0) / 100,
    raw: evt,
  });

  // On completion: unlock the linked course (if any) via existing enrollments table.
  // The payment/installment record above is already durably saved and this
  // event is already marked processed, so wrap the rest in try/catch — a bug
  // here (as previously happened with an undefined template variable) must
  // not surface as a 500, since a Paystack retry would just hit the
  // idempotency check and silently re-skip this notification forever.
  try {
    if (isComplete) {
      const { data: cohort } = await supabase
        .from("bootcamp_cohorts").select("course_id").eq("id", enrollment.cohort_id).maybeSingle();
      if (cohort?.course_id && enrollment.user_id) {
        await supabase.from("enrollments").upsert({
          user_id: enrollment.user_id,
          course_id: cohort.course_id,
          payment_status: "paid",
        }, { onConflict: "user_id,course_id" });
      }
      if (enrollment.user_id) {
        await supabase.from("notifications").insert({
          user_id: enrollment.user_id,
          title: "Bootcamp fully paid",
          message: "Thank you! Your bootcamp payment is complete.",
          type: "success",
          link: "/bootcamp",
        });
      }
    } else if (enrollment.user_id) {
      const message = enrollment.flexible_payment
        ? `Payment confirmed. ${newAmountPaid} of ${totalAmount} paid so far.`
        : `Installment ${paid} of ${enrollment.total_installments} confirmed.`;
      await supabase.from("notifications").insert({
        user_id: enrollment.user_id,
        title: "Payment received",
        message,
        type: "success",
        link: "/bootcamp",
      });
    }
  } catch (e) {
    console.error("bootcamp-paystack-webhook: post-payment unlock/notify failed", e);
  }

  return new Response("ok", { status: 200, headers: corsHeaders });
});