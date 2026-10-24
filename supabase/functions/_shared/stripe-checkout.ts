import { COUNTRY_TO_CURRENCY, FALLBACK_RATES_FROM_NGN } from "./currency-config.ts";

export class CheckoutCurrencyError extends Error {}

/** Resolve an explicitly requested currency; never silently charge a different one. */
export function resolveCheckoutCurrency(value: unknown): string {
  const currency = typeof value === "string" ? value.toUpperCase() : "USD";
  if (currency === "NGN" || !Object.values(COUNTRY_TO_CURRENCY).includes(currency)) {
    throw new CheckoutCurrencyError("This checkout currency is unavailable.");
  }
  // These currencies are not supported by this card checkout integration.
  if (["GHS", "KWD", "BHD", "OMR", "JOD"].includes(currency)) {
    throw new CheckoutCurrencyError("Online payment in your currency is currently unavailable. Please contact support.");
  }
  return currency;
}

export async function getNgnExchangeRate(currency: string): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/NGN", { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const json = await res.json();
      const rate = json?.rates?.[currency];
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) return rate;
    }
  } catch { /* Use the matching currency's outage rate when available. */ }
  const fallback = FALLBACK_RATES_FROM_NGN[currency];
  if (!fallback) throw new CheckoutCurrencyError("Currency pricing is temporarily unavailable. Please try again shortly.");
  return fallback;
}

export interface StripeLineItem {
  name: string;
  description?: string;
  unitAmountCents: number;
  quantity?: number;
}

export interface CreateStripeSessionInput {
  secretKey: string;
  currency: string;
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
  // Card checkout automatically displays eligible Apple Pay and Google Pay wallets.
  // Keep immediate payment methods: enrollment is fulfilled on successful payment.
  params.append("payment_method_types[0]", "card");
  params.append("adaptive_pricing[enabled]", "false");

  input.lineItems.forEach((item, index) => {
    params.append(`line_items[${index}][price_data][currency]`, input.currency.toLowerCase());
    params.append(`line_items[${index}][price_data][unit_amount]`, String(Math.round(item.unitAmountCents)));
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
