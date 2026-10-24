import { describe, expect, it, vi } from "vitest";
import { checkoutRoutes, initializeWithFallback, stripePaymentState, getPaystackCurrencies, type PaymentRoute } from "../../supabase/functions/_shared/payment-routing";

const successful = (route: PaymentRoute) => ({ status: 200, data: { authorization_url: "https://checkout.example.com/session", currency: route.currency, total: 100 } });
const unavailable = { status: 400, data: { error: "Currency not enabled on merchant account", retryable: true } };

describe("automatic payment routing", () => {
  it("discovers additional supported markets from Paystack's country API", async () => {
    vi.stubGlobal("AbortSignal", { timeout: () => undefined });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: true, data: [
      { default_currency_code: "RWF", relationships: { currency: { data: ["RWF"] } } },
      { default_currency_code: "NGN", relationships: { currency: { data: ["NGN", "USD"] } } },
    ] }) }));
    try {
      const currencies = await getPaystackCurrencies("test-key");
      expect(checkoutRoutes("RWF", currencies)[0]).toEqual({ gateway: "paystack", currency: "RWF" });
    } finally { vi.unstubAllGlobals(); }
  });
  it.each(["NGN", "GHS", "KES", "ZAR", "XOF"])("tries Paystack's %s checkout and then Stripe", (currency) => {
    expect(checkoutRoutes(currency).slice(0, 2)).toEqual([{ gateway: "paystack", currency }, { gateway: "stripe", currency }]);
  });

  it.each(["EUR", "GBP", "CAD", "JPY", "KWD"])("sends %s to Stripe first without a hardcoded country exclusion", (currency) => {
    expect(checkoutRoutes(currency)[0]).toEqual({ gateway: "stripe", currency });
  });

  it("does not retry the same USD route or ever fall back to naira abroad", () => {
    expect(checkoutRoutes("USD")).toEqual([{ gateway: "stripe", currency: "USD" }, { gateway: "paystack", currency: "USD" }]);
    expect(checkoutRoutes("GHS").map(r => r.currency)).not.toContain("NGN");
  });

  it("uses a working local provider immediately without initializing more sessions", async () => {
    const initialize = vi.fn(async (route: PaymentRoute) => successful(route));
    const result = await initializeWithFallback("GHS", initialize);
    expect(result.data).toMatchObject({ gateway: "paystack", currency: "GHS", fallback: false });
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it("uses Stripe local currency when Paystack cannot accept it on this account", async () => {
    const initialize = vi.fn(async (route: PaymentRoute) => route.gateway === "paystack" ? unavailable : successful(route));
    expect((await initializeWithFallback("KES", initialize)).data).toMatchObject({ gateway: "stripe", currency: "KES", fallback: false });
  });

  it("falls back to USD when neither account accepts the local currency", async () => {
    const initialize = vi.fn(async (route: PaymentRoute) => route.currency === "USD" ? successful(route) : unavailable);
    expect((await initializeWithFallback("GHS", initialize)).data).toMatchObject({ gateway: "stripe", currency: "USD", total: 100, fallback: true });
    expect(initialize).toHaveBeenCalledTimes(3);
  });

  it("falls back to Paystack USD if Stripe is unavailable", async () => {
    const initialize = vi.fn(async (route: PaymentRoute) => route.gateway === "stripe" ? { status: 503, data: { error: "Unavailable" } } : successful(route));
    expect((await initializeWithFallback("EUR", initialize)).data).toMatchObject({ gateway: "paystack", currency: "USD", fallback: true });
  });

  it("recovers from initialization transport errors without attempting a charge", async () => {
    const initialize = vi.fn(async (route: PaymentRoute) => {
      if (route.currency === "EUR") throw new Error("Network unavailable");
      return successful(route);
    });
    expect((await initializeWithFallback("EUR", initialize)).data.currency).toBe("USD");
  });

  it.each([401, 403, 404, 400])("does not bypass a %s auth, course, or promo validation failure", async (status) => {
    const initialize = vi.fn(async () => ({ status, data: { error: "Validation failed" } }));
    expect((await initializeWithFallback("EUR", initialize)).status).toBe(status);
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it("rejects a legacy response with mismatched currency before trying USD", async () => {
    const initialize = vi.fn(async () => successful({ gateway: "stripe", currency: "USD" }));
    const result = await initializeWithFallback("EUR", initialize);
    expect(result.data).toMatchObject({ currency: "USD", fallback: true });
    expect(initialize).toHaveBeenCalledTimes(2);
  });

  it("only reports service unavailability after exhausting valid routes", async () => {
    const initialize = vi.fn(async () => unavailable);
    expect((await initializeWithFallback("GHS", initialize)).status).toBe(503);
    expect(initialize).toHaveBeenCalledTimes(4);
  });
});

describe("delayed payment verification", () => {
  it("never fulfills a completed checkout whose payment is still unpaid", () => {
    expect(stripePaymentState({ status: "complete", payment_status: "unpaid" })).toBe("pending");
  });
  it("fulfills only confirmed paid or completed no-payment-required sessions", () => {
    expect(stripePaymentState({ status: "complete", payment_status: "paid" })).toBe("paid");
    expect(stripePaymentState({ status: "complete", payment_status: "no_payment_required" })).toBe("paid");
    expect(stripePaymentState({ status: "expired", payment_status: "unpaid" })).toBe("failed");
    expect(stripePaymentState({ status: "complete", payment_status: "unpaid", payment_intent_status: "requires_payment_method" })).toBe("failed");
    expect(stripePaymentState({ status: "complete", payment_status: "unpaid", payment_intent_status: "processing" })).toBe("pending");
  });
});
