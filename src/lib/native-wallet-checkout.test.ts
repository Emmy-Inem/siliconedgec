import { beforeEach, describe, expect, it, vi } from "vitest";
import { initializeNativeWalletCheckout } from "./native-wallet-checkout";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
beforeEach(() => invoke.mockReset());
const request = { currency: "EUR", course_ids: ["one", "two"], promo_code_id: "promo", callback_url: "https://siliconedgec.com/cart", cancel_url: "https://siliconedgec.com/cart" };

describe("native wallet sessions", () => {
  it("uses the server total and preserves cart, discount and verification details", async () => {
    invoke.mockResolvedValueOnce({ data: { session_id: "cs_test", client_secret: "session-secret", currency: "EUR", total: 240.12, reference: "order" } });
    const result = await initializeNativeWalletCheckout(request);
    expect(invoke).toHaveBeenCalledWith("stripe-cart-initialize", { body: { ...request, checkout_ui: "elements" } });
    expect(result).toMatchObject({ clientSecret: "session-secret", currency: "EUR", total: 240.12 });
    const url = new URL(result.returnUrl);
    expect(url.searchParams.get("session_id")).toBe("cs_test");
    expect(url.searchParams.get("reference")).toBe("order");
    expect(url.searchParams.get("stripe")).toBe("1");
  });
  it.each(["NGN", "GHS", "KES", "ZAR", "XOF", "EGP"])("never creates Stripe wallet sessions for local %s checkout", async (currency) => {
    await expect(initializeNativeWalletCheckout({ ...request, currency })).rejects.toThrow("local checkout");
    expect(invoke).not.toHaveBeenCalled();
  });
  it("falls back to a clearly identified USD session when local initialization is unavailable", async () => {
    invoke.mockResolvedValueOnce({ error: { context: new Response(JSON.stringify({ retryable: true }), { status: 400 }) } })
      .mockResolvedValueOnce({ data: { session_id: "cs_usd", client_secret: "secret", currency: "USD", total: 260 } });
    expect(await initializeNativeWalletCheckout(request)).toMatchObject({ currency: "USD", total: 260 });
    expect(invoke.mock.calls[1][1].body.currency).toBe("USD");
  });
  it("does not bypass authentication failures", async () => {
    invoke.mockResolvedValueOnce({ error: { context: new Response(JSON.stringify({ error: "Please sign in" }), { status: 401 }) } });
    await expect(initializeNativeWalletCheckout(request)).rejects.toThrow("Please sign in");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it("rejects legacy hosted-only handlers without creating a second order", async () => {
    invoke.mockResolvedValueOnce({ data: { authorization_url: "https://checkout.stripe.com/test", currency: "USD", total: 260 } });
    await expect(initializeNativeWalletCheckout(request)).rejects.toThrow("not ready");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it("rejects a session whose currency differs from the requested payment", async () => {
    invoke.mockResolvedValueOnce({ data: { session_id: "cs_test", client_secret: "secret", currency: "NGN", total: 500000 } });
    await expect(initializeNativeWalletCheckout(request)).rejects.toThrow();
  });
});
