export type PaymentGateway = "stripe" | "paystack";
export interface PaymentRoute { gateway: PaymentGateway; currency: string }

const PAYSTACK_CURRENCIES = new Set(["NGN", "GHS", "KES", "ZAR", "XOF", "EGP", "USD"]);
let paystackCurrenciesCache: { values: Set<string>; expires: number } | null = null;

export async function getPaystackCurrencies(secretKey?: string): Promise<Set<string>> {
  if (!secretKey) return PAYSTACK_CURRENCIES;
  if (paystackCurrenciesCache && paystackCurrenciesCache.expires > Date.now()) return paystackCurrenciesCache.values;
  try {
    const response = await fetch("https://api.paystack.co/country", {
      headers: { Authorization: `Bearer ${secretKey}` }, signal: AbortSignal.timeout(3000),
    });
    const body = await response.json();
    if (!response.ok || !body.status || !Array.isArray(body.data)) return PAYSTACK_CURRENCIES;
    const values = new Set<string>();
    for (const country of body.data) {
      for (const code of [country.default_currency_code, ...(country.relationships?.currency?.data || [])]) {
        if (typeof code === "string" && /^[A-Z]{3}$/.test(code)) values.add(code);
      }
    }
    if (values.size) {
      paystackCurrenciesCache = { values, expires: Date.now() + 15 * 60 * 1000 };
      return values;
    }
  } catch { /* Provider metadata outages must not block checkout. */ }
  return PAYSTACK_CURRENCIES;
}

/** Try local currency first. A provider's initialization is the authority on account eligibility. */
export function checkoutRoutes(requestedCurrency: string, paystackCurrencies = PAYSTACK_CURRENCIES): PaymentRoute[] {
  const currency = requestedCurrency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid currency");
  const routes: PaymentRoute[] = [];
  if (currency !== "USD" && paystackCurrencies.has(currency)) routes.push({ gateway: "paystack", currency });
  routes.push({ gateway: "stripe", currency });
  if (currency !== "USD") routes.push({ gateway: "stripe", currency: "USD" });
  if (paystackCurrencies.has("USD")) routes.push({ gateway: "paystack", currency: "USD" });
  return routes;
}

export interface CheckoutResult {
  authorization_url?: string;
  free?: boolean;
  currency?: string;
  total?: number;
  amount?: number;
  error?: string;
  retryable?: boolean;
  [key: string]: unknown;
}

export async function initializeWithFallback(
  currency: string,
  initialize: (route: PaymentRoute) => Promise<{ status: number; data: CheckoutResult }>,
  paystackCurrencies = PAYSTACK_CURRENCIES,
): Promise<{ status: number; data: CheckoutResult }> {
  for (const route of checkoutRoutes(currency, paystackCurrencies)) {
    let response: { status: number; data: CheckoutResult };
    try { response = await initialize(route); }
    catch { continue; } // Initialization never charges a customer; a transport outage can try another provider.
    const { status, data } = response;
    if (status >= 200 && status < 300 && !data.error) {
      if (data.free) return response;
      // Recognize the original fixed-currency, single-course responses during deployment.
      if (!data.currency && data.authorization_url) {
        if (route.gateway === "stripe" && route.currency === "USD" && typeof data.amount_usd === "number") {
          data.currency = "USD";
          data.amount = data.amount_usd;
        } else if (route.gateway === "paystack" && route.currency === "NGN" && typeof data.access_code === "string") {
          data.currency = "NGN";
        }
      }
      // Reject legacy or incorrectly deployed handlers before redirecting a customer.
      if (data.authorization_url && data.currency?.toUpperCase() === route.currency) {
        return { status, data: { ...data, gateway: route.gateway, fallback: route.currency !== currency.toUpperCase() } };
      }
      continue;
    }
    // Sign-in, course and promo validation failures must not be bypassed by changing provider.
    if (!data.retryable && status < 500 && status !== 429) return response;
  }
  return { status: 503, data: { error: "We couldn't connect to a payment service. Please try again in a moment." } };
}

export function stripePaymentState(session: { payment_status: string; status: string; payment_intent_status?: string }): "paid" | "pending" | "failed" {
  if (session.payment_status === "paid" || (session.payment_status === "no_payment_required" && session.status === "complete")) return "paid";
  if (session.status === "expired" || (session.status === "complete" && ["canceled", "requires_payment_method"].includes(session.payment_intent_status || ""))) return "failed";
  return "pending";
}
