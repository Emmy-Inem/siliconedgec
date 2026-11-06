// Server-only settings. An unset relay preserves the existing Lovable deployment.
type ReadEnv = (name: string) => string | undefined;
export function lovableConnection(read: ReadEnv) {
  const relay = read("SEC_LOVABLE_RELAY_URL")?.replace(/\/+$/, "");
  if (!relay) return { key: read("LOVABLE_API_KEY"), aiBase: "https://ai.gateway.lovable.dev/v1", emailUrl: null };
  const url = new URL(relay);
  if (url.protocol !== "https:" || !/^[a-z]{20}\.supabase\.co$/.test(url.hostname) ||
      url.pathname !== "/functions/v1/lovable-service-relay" || url.search || url.hash || url.username || url.password || url.port) {
    throw new Error("Invalid Lovable relay configuration");
  }
  const key = read("SEC_LOVABLE_RELAY_KEY");
  if (!key || key.length < 64) throw new Error("Lovable relay credential is missing");
  return { key, aiBase: `${relay}/ai/v1`, emailUrl: `${relay}/email` };
}
