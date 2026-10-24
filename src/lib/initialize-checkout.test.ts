import { beforeEach, describe, expect, it, vi } from "vitest";
import { initializeCheckout } from "./initialize-checkout";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
const httpError = (status: number, error: string) => ({ data: null, error: { context: new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } }) } });

beforeEach(() => invoke.mockReset());

describe("checkout deployment compatibility", () => {
  it("uses the server router when deployed", async () => {
    invoke.mockResolvedValueOnce({ data: { authorization_url: "https://checkout.stripe.com/test", currency: "EUR", total: 300 }, error: null });
    expect((await initializeCheckout({ currency: "EUR", course_ids: ["course"] })).currency).toBe("EUR");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("falls back when the missing router's failed preflight hides its HTTP status", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { name: "FunctionsFetchError", context: new TypeError("Failed to fetch") } })
      .mockResolvedValueOnce({ data: { authorization_url: "https://checkout.stripe.com/test", currency: "EUR", total: 1342 }, error: null });
    const result = await initializeCheckout({ currency: "EUR", course_ids: ["course"] });
    expect(result).toMatchObject({ currency: "EUR", total: 1342, gateway: "stripe" });
    expect(invoke.mock.calls[1][0]).toBe("stripe-cart-initialize");
  });

  it("reaches the existing USD cart checkout when a failed preflight hides the missing router and the old handler only supports USD", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { name: "FunctionsFetchError", context: new TypeError("Failed to fetch") } })
      .mockResolvedValueOnce({ data: { authorization_url: "https://checkout.stripe.com/old-local", currency: "USD", total: 1342 }, error: null })
      .mockResolvedValueOnce({ data: { authorization_url: "https://checkout.stripe.com/usd", currency: "USD", total: 1342 }, error: null });
    const result = await initializeCheckout({ currency: "EUR", course_ids: ["course"] });
    expect(result).toMatchObject({ currency: "USD", total: 1342, fallback: true });
    expect(invoke.mock.calls[2][1].body.currency).toBe("USD");
  });

  it("does not repeat provider attempts when a deployed router reports service unavailability", async () => {
    invoke.mockResolvedValueOnce(httpError(503, "Payment services unavailable"));
    await expect(initializeCheckout({ currency: "EUR", course_id: "course" })).rejects.toThrow("Payment services unavailable");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("preserves authentication errors from a response in a preview frame", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { context: {
      status: 401, clone: () => ({ json: async () => ({ message: "Session expired. Please sign in." }) }),
    } } });
    await expect(initializeCheckout({ currency: "EUR", course_id: "course" })).rejects.toThrow("Session expired. Please sign in.");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("keeps Nigerian single-course checkout working before router deployment", async () => {
    invoke.mockResolvedValueOnce(httpError(404, "Missing function"))
      .mockResolvedValueOnce({ data: { authorization_url: "https://checkout.paystack.com/test", access_code: "test" }, error: null });
    expect((await initializeCheckout({ currency: "NGN", course_id: "course" })).currency).toBe("NGN");
    expect(invoke.mock.calls[1][0]).toBe("paystack-initialize");
  });

  it("uses the legacy USD amount for an international single course during rollout", async () => {
    invoke.mockResolvedValueOnce(httpError(404, "Missing function"))
      .mockResolvedValueOnce({ data: { authorization_url: "https://checkout.stripe.com/local", amount_usd: 335.5 }, error: null })
      .mockResolvedValueOnce({ data: { authorization_url: "https://checkout.stripe.com/usd", amount_usd: 335.5 }, error: null });
    const result = await initializeCheckout({ currency: "EUR", course_id: "course" });
    expect(result).toMatchObject({ currency: "USD", amount: 335.5, fallback: true });
    expect(invoke.mock.calls[2][1].body.currency).toBe("USD");
  });

  it("never sends an international cart to a legacy naira checkout", async () => {
    invoke.mockResolvedValueOnce(httpError(404, "Missing function"))
      .mockResolvedValueOnce({ data: { authorization_url: "https://checkout.paystack.com/ngn", currency: "NGN", total: 500000 }, error: null })
      .mockResolvedValueOnce({ data: { authorization_url: "https://checkout.stripe.com/usd", currency: "USD", total: 335.5 }, error: null })
      .mockResolvedValueOnce({ data: { authorization_url: "https://checkout.stripe.com/usd2", currency: "USD", total: 335.5 }, error: null });
    const result = await initializeCheckout({ currency: "GHS", course_ids: ["course"] });
    expect(result).toMatchObject({ currency: "USD", total: 335.5, fallback: true });
    expect(result.authorization_url).not.toContain("ngn");
  });

  it("does not retry auth or validation errors from the server router", async () => {
    invoke.mockResolvedValueOnce(httpError(401, "Please sign in"));
    await expect(initializeCheckout({ currency: "EUR", course_id: "course" })).rejects.toThrow("Please sign in");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
