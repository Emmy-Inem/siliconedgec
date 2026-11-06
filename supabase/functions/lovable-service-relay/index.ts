// Deploy this function to the ORIGINAL Lovable backend only. It holds no destination DB keys.
import { sendLovableEmail } from "npm:@lovable.dev/email-js";
import { AI_PATHS, allowedAi, allowedEmail, authorizedRelay } from "./policy.ts";

const MAX_BYTES = 1024 * 1024;
const json = (error: string, status: number) => new Response(JSON.stringify({ error }), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
Deno.serve(async (req) => {
  if (req.method !== "POST") return json("Method not allowed", 405);
  const relayKey = Deno.env.get("SEC_LOVABLE_RELAY_KEY") ?? "";
  const providerKey = Deno.env.get("LOVABLE_API_KEY");
  if (!providerKey || relayKey.length < 64) return json("Service not configured", 503);
  if (!await authorizedRelay(req.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "", relayKey)) {
    return json("Unauthorized", 401);
  }
  const path = new URL(req.url).pathname.replace(/^.*\/lovable-service-relay/, "");
  if (path !== "/email" && !AI_PATHS.has(path)) return json("Unknown operation", 404);
  if (!req.body) return json("Request body required", 400);
  const reader = req.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); return json("Request too large", 413); }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const text = new TextDecoder().decode(bytes);
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return json("Invalid payload", 400);
    if (path === "/email") {
      if (!allowedEmail(body)) return json("Invalid email request", 400);
      // Destination queue retains duplicate protection, suppression and recipient authorization.
      await sendLovableEmail(body, { apiKey: providerKey, sendUrl: Deno.env.get("LOVABLE_SEND_URL") });
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }
    if (!allowedAi(body, path)) return json("Invalid AI request", 400);
    const upstream = await fetch(`https://ai.gateway.lovable.dev/v1/${path.endsWith("/responses") ? "responses" : "chat/completions"}`, {
      method: "POST", headers: { Authorization: `Bearer ${providerKey}`, "Content-Type": "application/json" },
      body: text, signal: req.signal,
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      return json("AI provider unavailable", upstream.status === 429 ? 429 : 502);
    }
    const responseHeaders: Record<string, string> = {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-store", "X-Accel-Buffering": "no",
    };
    const runId = upstream.headers.get("X-Lovable-AIG-Run-ID");
    if (runId) responseHeaders["X-Lovable-AIG-Run-ID"] = runId;
    return new Response(upstream.body, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof SyntaxError) return json("Invalid JSON", 400);
    // Do not log request bodies, recipients, prompts or provider credentials.
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 502;
    return json("Service unavailable", status === 429 ? 429 : status === 403 ? 403 : 502);
  }
});
