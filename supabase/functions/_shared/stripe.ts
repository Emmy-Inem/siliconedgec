// Shared Stripe API client and helper functions for Deno Supabase Edge Functions

const FALLBACK_NGN_TO_USD = 0.00067;

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

/**
 * Fetch current live NGN to USD exchange rate with safe fallback.
 */
export async function getNgnToUsdRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/NGN", { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const json = await res.json();
      const usdRate = json?.rates?.USD;
      if (typeof usdRate === "number" && usdRate > 0) {
        return usdRate;
      }
    }
  } catch (err) {
    console.warn("[Stripe FX] Live rate fetch failed, using fallback:", err);
  }
  return FALLBACK_NGN_TO_USD;
}

export interface StripeLineItem {
  name: string;
  description?: string;
  unitAmountCents: number;
  quantity?: number;
}

export interface CreateStripeSessionInput {
  secretKey: string;
  customerEmail: string;
  clientReferenceId: string;
  lineItems: StripeLineItem[];
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/**
 * Creates a hosted Stripe Checkout Session using native fetch.
 */
export async function createStripeCheckoutSession(input: CreateStripeSessionInput): Promise<{
  id: string;
  url: string;
  payment_intent?: string;
}> {
  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("customer_email", input.customerEmail);
  params.append("client_reference_id", input.clientReferenceId);
  params.append("success_url", input.successUrl);
  params.append("cancel_url", input.cancelUrl);
  params.append("payment_method_types[0]", "card");

  input.lineItems.forEach((item, index) => {
    params.append(`line_items[${index}][price_data][currency]`, "usd");
    params.append(`line_items[${index}][price_data][unit_amount]`, String(Math.max(50, Math.round(item.unitAmountCents)))); // Stripe minimum 50 cents
    params.append(`line_items[${index}][price_data][product_data][name]`, item.name);
    if (item.description) {
      params.append(`line_items[${index}][price_data][product_data][description]`, item.description);
    }
    params.append(`line_items[${index}][quantity]`, String(item.quantity ?? 1));
  });

  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) {
      params.append(`metadata[${k}]`, String(v));
    }
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.id || !data.url) {
    console.error("[Stripe] Session creation failed:", data);
    throw new Error(data?.error?.message || "Failed to create Stripe Checkout session");
  }

  return {
    id: data.id,
    url: data.url,
    payment_intent: data.payment_intent,
  };
}

/**
 * Retrieve and verify a Stripe Checkout Session.
 */
export async function retrieveStripeCheckoutSession(
  sessionId: string,
  secretKey: string
): Promise<{
  id: string;
  status: string;
  payment_status: string;
  customer_email?: string;
  amount_total?: number;
  currency?: string;
  client_reference_id?: string;
  payment_intent?: string;
  metadata?: Record<string, string>;
}> {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("[Stripe] Session retrieval failed:", data);
    throw new Error(data?.error?.message || "Failed to retrieve Stripe session");
  }

  return data;
}
