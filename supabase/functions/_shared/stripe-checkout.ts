import { FALLBACK_RATES_FROM_NGN } from "./currency-config.ts";

export class CheckoutCurrencyError extends Error {}

/** Resolve an explicitly requested currency; never silently charge a different one. */
export function resolveCheckoutCurrency(value: unknown): string {
  const currency = typeof value === "string" ? value.toUpperCase() : "USD";
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new CheckoutCurrencyError("This checkout currency is unavailable.");
  }
  return currency;
}

export async function getNgnExchangeRate(currency: string): Promise<number> {
  if (currency === "NGN") return 1;
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
  uiMode?: "hosted" | "elements";
  metadata?: Record<string, string>;
}

/**
 * Creates a hosted Stripe Checkout Session using native fetch.
 */
export async function createStripeCheckoutSession(input: CreateStripeSessionInput): Promise<{
  id: string;
  url: string;
  client_secret?: string;
  payment_intent?: string;
}> {
  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("customer_email", input.customerEmail);
  params.append("client_reference_id", input.clientReferenceId);
  if (input.uiMode === "elements") {
    params.append("ui_mode", "elements");
    params.append("return_url", input.successUrl);
    // This session is specifically for Apple Pay / Google Pay, both card wallets.
    params.append("payment_method_types[0]", "card");
  } else {
    params.append("success_url", input.successUrl);
    params.append("cancel_url", input.cancelUrl);
  }
  // Let Stripe choose all eligible methods from the merchant's Dashboard settings,
  // including wallets and delayed methods. Fulfillment waits for payment confirmation.
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
  if (!res.ok || !data.id || (input.uiMode === "elements" ? !data.client_secret : !data.url)) {
    console.error("[Stripe] Session creation failed:", data);
    throw new Error(data?.error?.message || "Failed to create Stripe Checkout session");
  }

  return {
    id: data.id,
    url: data.url,
    client_secret: data.client_secret,
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
  payment_intent_status?: string;
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

  // A completed checkout can still be processing or have failed with a delayed method.
  // Query the payment itself so a failed debit is not shown as processing forever.
  if (data.payment_status === "unpaid" && data.status === "complete" && typeof data.payment_intent === "string") {
    const intentRes = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(data.payment_intent)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!intentRes.ok) throw new Error("Unable to confirm payment status. Please try again shortly.");
    const intent = await intentRes.json();
    data.payment_intent_status = intent.status;
  }
  return data;
}
