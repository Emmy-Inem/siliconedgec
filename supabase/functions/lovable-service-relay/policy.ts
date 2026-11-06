// This endpoint has no database client and never receives a user's auth token.
export const AI_PATHS = new Set(["/ai/v1/chat/completions", "/ai/v1/responses"]);
const MODELS = new Set([
  "google/gemini-3-flash-preview", "google/gemini-3.6-flash",
  "google/gemini-2.5-flash", "openai/gpt-6-astra",
]);
export function allowedAi(body: Record<string, unknown>, path: string): boolean {
  return AI_PATHS.has(path) && typeof body.model === "string" && MODELS.has(body.model) &&
    (path.endsWith("/responses") ? body.store === false : Array.isArray(body.messages));
}
export function allowedEmail(body: Record<string, unknown>): boolean {
  const domain = body.sender_domain;
  const from = body.from;
  const domains = new Set(["siliconedgec.com", "notify.siliconedgec.com"]);
  const senderDomain = typeof from === "string" ? from.trim().match(/(?:^|<)[^<>\s@]+@([^<>\s]+)>?$/)?.[1]?.toLowerCase() : null;
  return typeof domain === "string" && domains.has(domain) && senderDomain === domain &&
    typeof body.to === "string" && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(body.to) &&
    typeof body.subject === "string" && body.subject.length > 0 && body.subject.length <= 998 &&
    (typeof body.html === "string" || typeof body.text === "string") &&
    typeof body.idempotency_key === "string" && body.idempotency_key.length > 0;
}
export async function authorizedRelay(received: string, expected: string): Promise<boolean> {
  if (expected.length < 64 || received.length !== expected.length) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([received, expected].map(value => crypto.subtle.digest("SHA-256", enc.encode(value))));
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
