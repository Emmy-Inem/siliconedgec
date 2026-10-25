import { describe, expect, it } from "vitest";
import { stripeSessionMatchesOrders } from "../../supabase/functions/_shared/stripe-order-validation";

const order = { user_id: "buyer", course_id: "course", reference: "order", amount: 240.12, currency: "USD", stripe_session_id: "cs_test", payment_gateway: "stripe" };
const session = { id: "cs_test", amount_total: 24012, currency: "usd", client_reference_id: "order", metadata: { user_id: "buyer", course_id: "course" } };
describe("Stripe payment ownership and totals", () => {
  it("accepts the exact server-priced order", () => expect(stripeSessionMatchesOrders(session, [order])).toBe(true));
  it.each([
    { user_id: "other" }, { course_id: "other" }, { reference: "other" },
    { amount: 1 }, { currency: "NGN" }, { stripe_session_id: "cs_other" }, { payment_gateway: "paystack" },
  ])("rejects mismatched order identity or pricing %j", change => expect(stripeSessionMatchesOrders(session, [{ ...order, ...change }])).toBe(false));
  it("requires every paid cart line", () => {
    const cart = { ...session, client_reference_id: "cart", amount_total: 48024, metadata: { user_id: "buyer", cart: "true", cart_reference: "cart", course_ids: "course,two" } };
    const lines = [order, { ...order, course_id: "two" }].map(o => ({ ...o, metadata: { cart_reference: "cart" } }));
    expect(stripeSessionMatchesOrders(cart, lines)).toBe(true);
    expect(stripeSessionMatchesOrders(cart, lines.slice(0, 1))).toBe(false);
  });
});