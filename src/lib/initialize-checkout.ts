import { supabase } from "@/integrations/supabase/client";
import { initializeWithFallback, type CheckoutResult } from "../../supabase/functions/_shared/payment-routing";
import { usesLocalPaymentOptions } from "./payment-options";
import { trackJourney } from "./journey-tracking";

async function invoke(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return { status: 200, data: data as CheckoutResult, transportFailure: false };
  // Failed preflights hide the missing-function 404 from browser JavaScript.
  // Check the response shape too: preview frames can use a different Response realm.
  const context = error.context;
  const response: Response | null = context && typeof context.status === "number" && typeof context.clone === "function" ? context : null;
  let result: CheckoutResult = { error: "Unable to connect to checkout." };
  if (response) {
    try {
      const body = await response.clone().json();
      result = { ...body, error: body.error || body.message || result.error };
    } catch { /* A missing function can return non-JSON. */ }
  }
  return { status: response?.status ?? 503, data: result, transportFailure: !response };
}

/** Keep checkout working while the new router and provider functions roll out separately. */
export async function initializeCheckout(body: Record<string, unknown> & { currency: string }) {
  void trackJourney("checkout_started");
  try {
  // A stale wallet entry must never bypass the customer's preferred local provider.
  const walletCheckout = body.wallet_checkout === true && !usesLocalPaymentOptions(body.currency);
  body = { ...body, wallet_checkout: walletCheckout };
  const initializeDirectly = () => initializeWithFallback(body.currency, async (route) => {
    const cart = Array.isArray(body.course_ids);
    return invoke(`${route.gateway}-${cart ? "cart-" : ""}initialize`, { ...body, currency: route.currency });
  }, walletCheckout ? new Set<string>() : undefined);

  // Explicit wallet checkout stays on the wallet-enabled account, including USD fallback.
  if (walletCheckout) {
    const result = await initializeDirectly();
    if (result.status < 200 || result.status >= 300 || result.data.error) throw new Error(result.data.error || "Unable to start wallet checkout.");
    if (result.data.authorization_url) void trackJourney("checkout_redirected");
    return result.data;
  }
  const routerResult = await invoke("checkout-initialize", body);
  let result: { status: number; data: CheckoutResult } = routerResult;
  if (routerResult.status === 404 || routerResult.transportFailure) {
    result = await initializeDirectly();
  }
  if (result.status < 200 || result.status >= 300 || result.data.error) throw new Error(result.data.error || "Unable to start checkout.");
  if (result.data.authorization_url) void trackJourney("checkout_redirected");
  return result.data;
  } catch (error) {
    void trackJourney("checkout_error", "payment_setup");
    throw error;
  }
}
