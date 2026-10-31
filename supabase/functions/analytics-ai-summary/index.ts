import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createResponsesCall } from "./responses.ts";
import { safeEvidence } from "./evidence.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (error: string, status: number) => new Response(JSON.stringify({ error }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json("Method not allowed", 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json("Please sign in.", 401);
  const url = Deno.env.get("SUPABASE_URL"); const anon = Deno.env.get("SUPABASE_ANON_KEY"); const key = Deno.env.get("LOVABLE_API_KEY");
  if (!url || !anon || !key) return json("AI summary configuration is incomplete.", 401);
  const client = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: claims, error: authError } = await client.auth.getClaims(authorization.slice(7));
  if (authError || !claims?.claims?.sub) return json("Please sign in again.", 401);
  const { data: allowed, error: roleError } = await client.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
  if (roleError || !allowed) return json("Administrator access required.", 403);
  let body;
  try { body = await req.json(); } catch { return json("Choose a valid reporting period.", 400); }
  const from = new Date(body?.p_from); const to = new Date(body?.p_to);
  if (!body?.p_from || !body?.p_to || !Number.isFinite(+from) || !Number.isFinite(+to) || +to <= +from || +to - +from > 366 * 86400_000) return json("Choose a reporting period within one year.", 400);
  const limit = checkRateLimit({ key: `analytics-summary:${claims.claims.sub}`, limit: 5, windowMs: 300_000 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter, corsHeaders);
  const range = { p_from: from.toISOString(), p_to: to.toISOString() };
  const [audience, journey] = await Promise.all([client.rpc("admin_audience_analytics", range), client.rpc("admin_journey_analytics", range)]);
  if (audience.error || journey.error) return json("The analytics report could not be loaded. No summary was generated.", 500);
  const evidence = safeEvidence(audience.data, journey.data);
  try {
    const { result } = createResponsesCall(req, { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, model: "openai/gpt-6-astra" },
      [{ role: "user", content: JSON.stringify({ period: range, evidence }) }],
      "You review website analytics for Silicon Edge Consulting. Give a concise markdown summary with three sections: Observed results, Possible explanations, Recommended checks. Cite supplied counts exactly, never invent numbers, credentials or causes. Counts are independent milestone reach, not a sequential funnel. The cohort consists of new learner accounts, unlike all-account signups. Activity is optional and consent-gated; absence is not evidence of disengagement. New accounts have unequal follow-up. Inactive last pages are not confirmed exits. Unpaid checkout after 24h is not confirmed abandonment. Never claim trust or motive was measured. If tracking has no records, state that journey conclusions are premature and suggest collecting consented activity before judging drop-off. Give up to three practical checks grounded in the evidence. Do not identify individuals.");
    const reader = result.textStream.getReader();
    const first = await reader.read();
    if (first.done) return json("AI returned no summary.", 502);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try { controller.enqueue(encoder.encode(first.value)); while (true) { const part = await reader.read(); if (part.done) break; controller.enqueue(encoder.encode(part.value)); } controller.close(); }
        catch { controller.enqueue(encoder.encode("\n\nSummary interrupted. Please review the recorded figures above.")); controller.close(); }
      }, cancel(reason) { return reader.cancel(reason); },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (err) {
    if (req.signal.aborted) return json("Summary stopped.", 499);
    const failure = err as { statusCode?: number; responseBody?: string; message?: string };
    let message = "AI summary unavailable.";
    try { const upstream = JSON.parse(failure.responseBody || "{}"); message = upstream.error?.message || upstream.message || message; } catch { /* Never expose raw error bodies. */ }
    return json(message, failure.statusCode && failure.statusCode >= 400 && failure.statusCode <= 599 ? failure.statusCode : 502);
  }
});