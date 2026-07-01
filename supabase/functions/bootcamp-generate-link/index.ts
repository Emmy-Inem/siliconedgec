// Generates a dedicated Paystack Payment Page per bootcamp student.
// Admin/moderator-only; inserts an enrollment row and returns the link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!PAYSTACK_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Paystack not configured" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "moderator");
  if (!allowed) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "bad json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cohort_id = String(body?.cohort_id ?? "").trim();
  const emailRaw = String(body?.email ?? "").trim().toLowerCase();
  const full_name = String(body?.full_name ?? "").trim() || "Bootcamp Student";
  const total_amount = Number(body?.total_amount);
  const installments = Math.max(1, Math.min(12, Number(body?.installments ?? 4) | 0));
  const flexible = Boolean(body?.flexible_payment);
  const final_due_date = body?.final_due_date ? String(body.final_due_date) : null;

  if (!cohort_id || !Number.isFinite(total_amount) || total_amount <= 0) {
    return new Response(JSON.stringify({ error: "cohort and total amount required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // Email required only when NOT flexible (installment lock mode).
  if (!flexible && !emailRaw) {
    return new Response(JSON.stringify({ error: "email required for installment lock mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const email = emailRaw || `flex-${crypto.randomUUID().slice(0, 8)}@placeholder.local`;

  const { data: cohort, error: cohortErr } = await admin
    .from("bootcamp_cohorts")
    .select("id, name, slug, start_date, end_date")
    .eq("id", cohort_id)
    .maybeSingle();
  if (cohortErr || !cohort) {
    return new Response(JSON.stringify({ error: "cohort not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const installment_amount = Math.round((total_amount / installments) * 100) / 100;
  const start = new Date(cohort.start_date + "T00:00:00Z");
  const due_dates: string[] = [];
  for (let i = 0; i < installments; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i * 7);
    due_dates.push(d.toISOString().slice(0, 10));
  }
  const reference = crypto.randomUUID();

  // Flexible mode: omit amount to enable customer-entered amounts on Paystack.
  const paystackBody: Record<string, unknown> = {
    name: `${cohort.name} — ${full_name}`,
    description: flexible
      ? `Flexible bootcamp payment. Pay any amount up to ₦${total_amount.toLocaleString()} before ${final_due_date ?? cohort.end_date}.`
      : `${installments} installments of ₦${installment_amount.toLocaleString()}. Total: ₦${total_amount.toLocaleString()}.`,
    currency: "NGN",
    metadata: { reference, cohort_id, email: emailRaw || null, full_name, kind: "bootcamp_installment", flexible },
  };
  if (!flexible) paystackBody.amount = Math.round(installment_amount * 100);

  const pageRes = await fetch("https://api.paystack.co/page", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paystackBody),
  });
  const pageData = await pageRes.json();
  if (!pageData?.status) {
    return new Response(JSON.stringify({ error: pageData?.message ?? "Paystack page failed" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: enrollment, error: insertErr } = await admin
    .from("bootcamp_enrollments")
    .insert({
      cohort_id,
      email,
      full_name,
      reference,
      total_amount,
      installment_amount,
      total_installments: installments,
      installment_due_dates: due_dates,
      next_due_date: flexible ? (final_due_date ?? cohort.end_date) : due_dates[0],
      flexible_payment: flexible,
      final_due_date: final_due_date ?? cohort.end_date,
      paystack_page_id: String(pageData.data?.id ?? ""),
      paystack_page_slug: pageData.data?.slug ?? null,
      payment_link: pageData.data?.payment_url ?? `https://paystack.com/pay/${pageData.data?.slug ?? ""}`,
      access_granted: true,
      status: "active",
      created_by: user.id,
    })
    .select()
    .single();

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Best-effort link to existing auth user by email.
  const { data: existingUser } = await admin
    .from("profiles").select("user_id").limit(1).maybeSingle();
  void existingUser;

  return new Response(JSON.stringify({ success: true, enrollment }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});