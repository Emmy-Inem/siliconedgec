// Shared Stripe API client and helper functions for Deno Supabase Edge Functions


/**
 * Robustly resolve the Stripe secret key.
 * Checks:
 * 1. Deno.env (STRIPE_SECRET_KEY, STRIPE_KEY, STRIPE_API_KEY)
 * 2. Supabase Vault via public.get_secret() RPC
 * 3. site_content table
 */
export async function getStripeSecretKey(supabaseAdmin: any): Promise<string | null> {
  // 1. Deno environment variables
  const envKey =
    Deno.env.get("STRIPE_SECRET_KEY") ||
    Deno.env.get("STRIPE_KEY") ||
    Deno.env.get("STRIPE_API_KEY");
  if (envKey && envKey.trim()) return envKey.trim();

  // 2. Database vault via get_secret RPC
  const candidateNames = [
    "stripe_secret_key",
    "STRIPE_SECRET_KEY",
    "stripe_api_key",
    "STRIPE_API_KEY",
    "stripe_key",
    "STRIPE_KEY",
    "stripe",
    "STRIPE",
  ];

  for (const name of candidateNames) {
    try {
      const { data, error } = await supabaseAdmin.rpc("get_secret", { secret_name: name });
      if (!error && typeof data === "string" && data.trim()) {
        return data.trim();
      }
    } catch (_) {
      // RPC may not be present or throw, continue to next candidate
    }
  }

  // 3. Fallback: query site_content directly
  try {
    const { data: rows } = await supabaseAdmin
      .from("site_content")
      .select("value")
      .in("key", candidateNames)
      .limit(1);
    if (rows && rows.length > 0 && rows[0].value) {
      return String(rows[0].value).trim();
    }
  } catch (_) {}

  return null;
}

export { CheckoutCurrencyError, resolveCheckoutCurrency, getNgnExchangeRate, createStripeCheckoutSession, retrieveStripeCheckoutSession } from "./stripe-checkout.ts";
export type { StripeLineItem, CreateStripeSessionInput } from "./stripe-checkout.ts";
