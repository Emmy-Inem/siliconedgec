// Server-only settings. An unset relay preserves the existing Lovable deployment.
type ReadEnv = (name: string) => string | undefined;
export function lovableConnection(read: ReadEnv) {
  // Explicit activation: merely saving a key must not change production data handling.
  if (read("GEMINI_ENABLED") === "true") {
    const key = read("GEMINI_API_KEY");
    if (!key) throw new Error("Gemini credential is missing");
    return { key, aiBase: "https://generativelanguage.googleapis.com/v1beta/openai", emailUrl: null, provider: "gemini" as const };
  }
  return legacyConnection(read);
}

export function aiModel(original: string, read: ReadEnv): string {
  return read("GEMINI_ENABLED") === "true" ? (read("GEMINI_MODEL") || "gemini-2.5-flash") : original;
}

// Email and AI credentials are independent, including during partial migration.
export function emailConnection(read: ReadEnv) {
  if (read("RESEND_ENABLED") === "true") {
    const key = read("RESEND_API_KEY");
    if (!key) throw new Error("Resend credential is missing");
    return { key, emailUrl: "https://api.resend.com/emails", provider: "resend" as const };
  }
  return legacyConnection(read);
}

function legacyConnection(read: ReadEnv) {
  const relay = read("SEC_LOVABLE_RELAY_URL")?.replace(/\/+$/, "");
  if (!relay) return { key: read("LOVABLE_API_KEY"), aiBase: "https://ai.gateway.lovable.dev/v1", emailUrl: null, provider: "lovable" as const };
  const url = new URL(relay);
  if (url.protocol !== "https:" || !/^[a-z]{20}\.supabase\.co$/.test(url.hostname) ||
      url.pathname !== "/functions/v1/lovable-service-relay" || url.search || url.hash || url.username || url.password || url.port) {
    throw new Error("Invalid Lovable relay configuration");
  }
  const key = read("SEC_LOVABLE_RELAY_KEY");
  if (!key || key.length < 64) throw new Error("Lovable relay credential is missing");
  return { key, aiBase: `${relay}/ai/v1`, emailUrl: `${relay}/email`, provider: "relay" as const };
}
