import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectVisitorCurrency, ensureGeoCountry, formatLocalized } from "@/lib/currency";
import { resolvePaymentGateway } from "@/lib/geo-routing";
import { currencyFactor, roundCurrencyAmount } from "../../supabase/functions/_shared/currency-config";
import { createStripeCheckoutSession, getNgnExchangeRate, resolveCheckoutCurrency, retrieveStripeCheckoutSession } from "../../supabase/functions/_shared/stripe-checkout";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";

beforeEach(() => {
  // jsdom lacks the Deno runtime's AbortSignal.timeout API.
  vi.stubGlobal("AbortSignal", { timeout: () => undefined });
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("visitor checkout currencies", () => {
  it.each([
    ["NG", "NGN", "paystack"], ["NL", "EUR", "stripe"],
    ["GB", "GBP", "stripe"], ["KE", "KES", "paystack"],
    ["ZA", "ZAR", "paystack"], ["JP", "JPY", "stripe"],
  ])("uses %s's own currency and automatic gateway", (country, currency, gateway) => {
    localStorage.setItem("sec_geo_country", country);
    localStorage.setItem("sec_geo_at", String(Date.now()));
    expect(detectVisitorCurrency()).toBe(currency);
    expect(resolvePaymentGateway(country)).toBe(gateway);
  });

  it("updates a Nigerian visitor's cached location when the IP lookup resolves abroad", async () => {
    localStorage.setItem("sec_geo_country", "NG");
    localStorage.setItem("sec_geo_at", "0");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("loc=NL\n")));
    await ensureGeoCountry();
    expect(detectVisitorCurrency()).toBe("EUR");
  });

  it("waits for location before showing prices or allowing checkout abroad", async () => {
    localStorage.setItem("sec_geo_country", "NG");
    localStorage.setItem("sec_geo_at", "0");
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url.includes("cdn-cgi") ? new Response("loc=NL\n") : Response.json({ rates: { EUR: 0.000671 } }),
    ));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => useLocalizedPrice(), {
      wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
    });
    expect(result.current.ready).toBe(false);
    expect(result.current.format(500000)).toBe("…");
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.currency).toBe("EUR");
    expect(result.current.format(500000)).toContain("335.5");
    expect(result.current.format(500000)).not.toMatch(/NGN|₦/);
    unmount();
    client.clear();
  });

  it("offers USD pricing when a local exchange rate is unavailable", async () => {
    localStorage.setItem("sec_geo_country", "PL");
    localStorage.setItem("sec_geo_at", String(Date.now()));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => useLocalizedPrice(), {
      wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.currency).toBe("USD");
    expect(result.current.format(500000)).toContain("335");
    expect(result.current.format(500000)).not.toMatch(/₦|unavailable/);
    unmount();
    client.clear();
  });

  it("preserves local minor units in displayed prices", () => {
    expect(formatLocalized(1000, "KES", 0.08735, "en-US")).toContain("87.35");
    expect(formatLocalized(1000, "JPY", 0.1004, "en-US")).toBe("¥100");
    expect(roundCurrencyAmount(123.45, "UGX") * currencyFactor("UGX")).toBe(12300);
    expect(roundCurrencyAmount(123.95, "ISK") * currencyFactor("ISK")).toBe(12400);
  });

  it("lets the provider decide which valid currencies the account supports", () => {
    expect(resolveCheckoutCurrency("GHS")).toBe("GHS");
    expect(resolveCheckoutCurrency("NGN")).toBe("NGN");
    expect(() => resolveCheckoutCurrency("INVALID")).toThrow();
    expect(resolveCheckoutCurrency("eur")).toBe("EUR");
  });

  it("uses a server-fetched rate in the requested currency", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ rates: { EUR: 0.0006, USD: 0.0007 } })));
    expect(await getNgnExchangeRate("EUR")).toBe(0.0006);
  });

  it("never labels a USD fallback as an unrelated currency during an outage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(getNgnExchangeRate("PLN")).rejects.toThrow("temporarily unavailable");
    expect(await getNgnExchangeRate("EUR")).toBe(0.00062);
  });

  it.each(["processing", "requires_payment_method"])("rechecks delayed payment status: %s", async (status) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ id: "cs_test", status: "complete", payment_status: "unpaid", payment_intent: "pi_test" }))
      .mockResolvedValueOnce(Response.json({ id: "pi_test", status }));
    vi.stubGlobal("fetch", fetchMock);
    const session = await retrieveStripeCheckoutSession("cs_test", "test-key");
    expect(session.payment_intent_status).toBe(status);
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.stripe.com/v1/payment_intents/pi_test");
  });

  it.each([["EUR", 335.5, 33550], ["JPY", 50000, 50000], ["KES", 120.35, 12035]])(
    "sends %s and its correct minor units to hosted checkout without changing the amount",
    async (currency, amount, minor) => {
      const request = vi.fn().mockResolvedValue(Response.json({ id: "cs_test", url: "https://checkout.stripe.com/test" }));
      vi.stubGlobal("fetch", request);
      await createStripeCheckoutSession({
        secretKey: "test", currency, customerEmail: "test@example.com", clientReferenceId: "test",
        successUrl: "https://example.com/success", cancelUrl: "https://example.com/cancel",
        lineItems: [{ name: "Course", unitAmountCents: Math.round(amount * currencyFactor(currency)) }],
      });
      const body = new URLSearchParams(request.mock.calls[0][1].body);
      expect(body.get("line_items[0][price_data][currency]")).toBe(currency.toLowerCase());
      expect(body.get("line_items[0][price_data][unit_amount]")).toBe(String(minor));
      expect(body.has("payment_method_types[0]")).toBe(false);
      expect(body.get("adaptive_pricing[enabled]")).toBe("false");
    },
  );

  it("creates an Elements session with a return URL and client secret rather than a hosted redirect", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ id: "cs_wallet", client_secret: "wallet-secret", url: null }));
    vi.stubGlobal("fetch", request);
    const session = await createStripeCheckoutSession({
      secretKey: "test", currency: "EUR", customerEmail: "test@example.com", clientReferenceId: "order",
      successUrl: "https://siliconedgec.com/cart?session_id={CHECKOUT_SESSION_ID}", cancelUrl: "https://siliconedgec.com/cart",
      uiMode: "elements", lineItems: [{ name: "Course", unitAmountCents: 1000 }],
    });
    expect(session.client_secret).toBe("wallet-secret");
    const body = new URLSearchParams(request.mock.calls[0][1].body);
    expect(body.get("ui_mode")).toBe("elements");
    expect(body.get("return_url")).toContain("session_id={CHECKOUT_SESSION_ID}");
    expect(body.has("success_url")).toBe(false);
    expect(body.has("cancel_url")).toBe(false);
    expect(body.get("payment_method_types[0]")).toBe("card");
  });
});
