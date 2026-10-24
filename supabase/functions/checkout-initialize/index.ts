import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { initializeWithFallback, getPaystackCurrencies } from "../_shared/payment-routing.ts";

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  try {
    const authorization = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL") || "";
    const supabase = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    const { data: { user }, error } = await supabase.auth.getUser(authorization.replace(/^Bearer /i, ""));
    if (error || !user) return new Response(JSON.stringify({ error: "Please sign in to continue." }), { status: 401, headers });
    const body = await req.json();
    if (typeof body.currency !== "string" || !/^[A-Za-z]{3}$/.test(body.currency)) {
      return new Response(JSON.stringify({ error: "Invalid currency" }), { status: 400, headers });
    }
    const cart = Array.isArray(body.course_ids);
    if ((!cart && !body.course_id) || (cart && body.course_ids.length === 0)) {
      return new Response(JSON.stringify({ error: "Choose a course to continue." }), { status: 400, headers });
    }
    const paystackCurrencies = await getPaystackCurrencies(Deno.env.get("PAYSTACK_SECRET_KEY"));
    const result = await initializeWithFallback(body.currency, async (route) => {
      const endpoint = `${route.gateway}-${cart ? "cart-" : ""}initialize`;
      const response = await fetch(`${url}/functions/v1/${endpoint}`, {
        method: "POST",
        headers: { Authorization: authorization, apikey: Deno.env.get("SUPABASE_ANON_KEY") || "", "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, currency: route.currency }),
        signal: AbortSignal.timeout(15000),
      });
      return { status: response.status, data: await response.json() };
    }, paystackCurrencies);
    return new Response(JSON.stringify(result.data), { status: result.status, headers });
  } catch {
    return new Response(JSON.stringify({ error: "Unable to start checkout. Please try again shortly." }), { status: 503, headers });
  }
});
