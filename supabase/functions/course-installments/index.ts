import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { currencyFactor } from "../_shared/currency-config.ts";
import { checkoutRoutes, getPaystackCurrencies } from "../_shared/payment-routing.ts";
import { getNgnExchangeRate, getStripeSecretKey, createStripeCheckoutSession, retrieveStripeCheckoutSession } from "../_shared/stripe.ts";
import { installmentSchedule } from "../_shared/installment-schedule.ts";
import { recordCheckoutTerms, PAYMENT_TERMS_VERSION } from "../_shared/checkout-terms.ts";

Deno.serve(async req => {
  const preflight = handleCors(req); if (preflight) return preflight;
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" };
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser((req.headers.get("Authorization") || "").replace(/^Bearer /i, ""));
    if (!user) return new Response(JSON.stringify({ error: "Please sign in to manage payments." }), { status: 401, headers });
    const body = await req.json();
    const stripeKey = await getStripeSecretKey(admin);
    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    const origin = new URL(req.headers.get("Origin") || "https://siliconedgec.com").origin;
    const allowedOrigin = /^https:\/\/(www\.)?siliconedgec\.com$/.test(origin) || /^https:\/\/(preview--)?siliconedgec\.lovable\.app$/.test(origin);
    const returnBase = `${allowedOrigin ? origin : "https://siliconedgec.com"}/flexible-payments`;
    if (body.action === "verify") {
      const { data: payment } = await admin.from("course_payment_installments").select("*, course_payment_agreements!inner(*)").eq("id", body.payment_id).single();
      const agreement = payment?.course_payment_agreements;
      if (!payment || agreement.user_id !== user.id) throw new Error("Payment not found.");
      if (payment.status === "paid") return new Response(JSON.stringify({ verified: true }), { headers });
      let amount: number; let currency: string; let reference: string;
      if (payment.gateway === "stripe") {
        if (!stripeKey || !payment.provider_id) throw new Error("Payment is not ready.");
        const session = await retrieveStripeCheckoutSession(payment.provider_id, stripeKey);
        if (session.payment_status !== "paid") return new Response(JSON.stringify({ verified: false, pending: true }), { headers });
        if (session.metadata?.installment_payment_id !== payment.id || session.metadata?.user_id !== user.id) throw new Error("Payment identity mismatch.");
        amount = Number(session.amount_total); currency = String(session.currency).toUpperCase(); reference = session.client_reference_id || "";
      } else {
        if (!paystackKey) throw new Error("Payment is not configured.");
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(payment.reference)}`, { headers: { Authorization: `Bearer ${paystackKey}` } });
        const result = await response.json();
        if (!response.ok || !result.status || result.data?.status !== "success") return new Response(JSON.stringify({ verified: false, pending: true }), { headers });
        if (result.data.metadata?.installment_payment_id !== payment.id || result.data.metadata?.user_id !== user.id) throw new Error("Payment identity mismatch.");
        amount = Number(result.data.amount); currency = String(result.data.currency).toUpperCase(); reference = result.data.reference;
      }
      if (amount !== Number(payment.amount_minor) || currency !== agreement.currency || reference !== payment.reference) throw new Error("Payment amount or currency mismatch.");
      const { error } = await admin.rpc("settle_course_installment", { p_payment_id: payment.id }); if (error) throw error;
      return new Response(JSON.stringify({ verified: true }), { headers });
    }

    if (body.action === "quote" || body.action === "start") {
      const ids = [...new Set<string>(body.course_ids || [])];
      if (!ids.length || ids.length > 20) throw new Error("Choose your courses.");
      const { data: courses, error } = await admin.from("courses").select("id,slug,title,category,price,discount_price,start_date,duration_weeks,is_published").in("id", ids);
      const normalizedCourses = (courses ?? []).map((c: any) => ({
        ...c,
        start_date: c.start_date || (/data[- ]engineering/i.test(`${c.slug ?? ""} ${c.title ?? ""} ${c.category ?? ""}`) || c.id === "20360c5a-2279-4a64-a373-3514f81cb600" ? null : "2026-11-28"),
        duration_weeks: c.duration_weeks && c.duration_weeks > 0 ? c.duration_weeks : 4,
      }));
      if (error || normalizedCourses.length !== ids.length || normalizedCourses.some(c => !c.is_published || !c.start_date || !c.duration_weeks)) throw new Error("Flexible payments require a published start date and course length for every selected course. Contact us for help.");
      const { data: enrolled } = await admin.from("enrollments").select("course_id").eq("user_id", user.id).in("course_id", ids).in("payment_status", ["paid", "confirmed", "granted", "completed", "success"]);
      if (enrolled?.length) throw new Error("One or more courses already have enrollment. View your existing payment plan or remove them from your cart.");
      if (body.promo_code_id) throw new Error("Remove the promo code before choosing flexible payments, or pay in full with your discount.");
      const currency = String(body.currency || "").toUpperCase(); if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid currency.");
      const rate = await getNgnExchangeRate(currency);
      const totalMinor = Math.round(courses.reduce((sum, c) => sum + Number(c.price), 0) * rate * currencyFactor(currency));
      const count = Number(body.count);
      const schedules = normalizedCourses.map(c => installmentSchedule(c.start_date, c.duration_weeks, count, totalMinor));
      const deadline = schedules.map(s => s.deadline).sort()[0];
      const quote = { currency, total_minor: totalMinor, factor: currencyFactor(currency), schedule: schedules[0].payments, deadline };
      if (body.action === "quote") return new Response(JSON.stringify(quote), { headers });
      if (!body.approved_quote || JSON.stringify(body.approved_quote) !== JSON.stringify({ total_minor: quote.total_minor, currency: quote.currency, schedule: quote.schedule, deadline: quote.deadline })) throw new Error("Your schedule or price has changed. Review a fresh quote before continuing.");
      if (body.installment_terms_accepted !== true) throw new Error("Please accept the weekly payment schedule and final deadline.");
      await recordCheckoutTerms(admin, user.id, { ...body, payment_option: "installments" });
      // Serialize agreement creation, preventing double-clicks and concurrent plans for the same course.
      const { data: agreementId, error: createError } = await admin.rpc("create_course_payment_agreement", {
        p_user_id: user.id, p_course_ids: ids, p_currency: currency, p_total_minor: totalMinor,
        p_schedule: quote.schedule, p_deadline: deadline, p_terms_version: PAYMENT_TERMS_VERSION,
      });
      if (createError) throw new Error("A payment plan already exists. Open My flexible payments to continue.");
      return new Response(JSON.stringify({ agreement_id: agreementId }), { headers });
    }

    if (body.action === "pay") {
      const { data: agreement } = await admin.from("course_payment_agreements").select("*").eq("id", body.agreement_id).eq("user_id", user.id).single();
      if (!agreement || agreement.status === "completed") throw new Error("No outstanding payment found.");
      await recordCheckoutTerms(admin, user.id, { ...body, course_ids: agreement.course_ids, currency: agreement.currency, payment_option: "installments" });
      const { data: paid } = await admin.from("course_payment_installments").select("number").eq("agreement_id", agreement.id).eq("status", "paid");
      const next = (agreement.schedule as any[]).find(item => !(paid || []).some(p => p.number === item.number));
      if (!next) throw new Error("Your plan is already paid.");
      const { data: existing } = await admin.from("course_payment_installments").select("*").eq("agreement_id", agreement.id).eq("number", next.number).maybeSingle();
      // A single installment has one reference and provider. Never create concurrent payable sessions.
      if (existing?.authorization_url) return new Response(JSON.stringify({ authorization_url: existing.authorization_url, currency: agreement.currency, total: existing.amount_minor / currencyFactor(agreement.currency) }), { headers });
      const routes = checkoutRoutes(agreement.currency, await getPaystackCurrencies(paystackKey)).filter(r => r.currency === agreement.currency);
      for (const route of routes) {
        if ((route.gateway === "stripe" && !stripeKey) || (route.gateway === "paystack" && !paystackKey)) continue;
        const { data: insertedPayment, error } = await admin.from("course_payment_installments").upsert({ agreement_id: agreement.id, number: next.number, amount_minor: next.amount_minor, due_at: next.due_at, gateway: route.gateway }, { onConflict: "agreement_id,number", ignoreDuplicates: true }).select("*").maybeSingle();
        const payment = existing || insertedPayment;
        if (error || !payment) throw new Error("Payment is already being prepared. Refresh your payment plan shortly.");
        if (existing && existing.gateway !== route.gateway) continue;
        const returnUrl = `${returnBase}?payment_id=${payment.id}`;
        let providerId: string; let authorizationUrl: string;
        try {
          if (route.gateway === "stripe") {
            const session = await createStripeCheckoutSession({ secretKey: stripeKey!, idempotencyKey: payment.reference, currency: agreement.currency, customerEmail: user.email!, clientReferenceId: payment.reference,
              lineItems: [{ name: `Course payment ${next.number} of ${agreement.schedule.length}`, unitAmountCents: Number(payment.amount_minor) }],
              successUrl: returnUrl, cancelUrl: returnBase, metadata: { installment_payment_id: payment.id, user_id: user.id } });
            providerId = session.id; authorizationUrl = session.url;
          } else {
            const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${paystackKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, amount: Number(payment.amount_minor), currency: agreement.currency, reference: payment.reference, callback_url: returnUrl, metadata: { installment_payment_id: payment.id, user_id: user.id } }) });
            const result = await response.json(); if (!response.ok || !result.status) throw new Error(result.message || "Payment unavailable.");
            providerId = result.data.reference; authorizationUrl = result.data.authorization_url;
          }
          const { error: saveError } = await admin.from("course_payment_installments").update({ provider_id: providerId, authorization_url: authorizationUrl }).eq("id", payment.id);
          if (saveError) throw saveError;
          return new Response(JSON.stringify({ authorization_url: authorizationUrl, currency: agreement.currency, total: Number(payment.amount_minor) / currencyFactor(agreement.currency) }), { headers });
        } catch {
          // An ambiguous initialization may have created a valid session. Keep its reference for reconciliation.
          throw new Error("Unable to prepare this payment. Please contact support with your payment plan ID.");
        }
      }
      throw new Error("Payment in this currency is unavailable. Contact support before starting a plan.");
    }
    throw new Error("Unknown payment action.");
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unable to manage payment." }), { status: 400, headers });
  }
});
