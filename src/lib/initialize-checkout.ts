import { supabase } from "@/integrations/supabase/client";
import { initializeWithFallback, type CheckoutResult } from "../../supabase/functions/_shared/payment-routing";

async function invoke(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return { status: 200, data: data as CheckoutResult };
  const response = error.context instanceof Response ? error.context : null;
  let result: CheckoutResult = { error: "Unable to connect to checkout." };
  if (response) {
    try { result = await response.clone().json(); } catch { /* A missing function can return non-JSON. */ }
  }
  return { status: response?.status ?? 503, data: result };
}

/** Keep checkout working while the new router and provider functions roll out separately. */
export async function initializeCheckout(body: Record<string, unknown> & { currency: string }) {
  let result = await invoke("checkout-initialize", body);
  if (result.status === 404) {
    result = await initializeWithFallback(body.currency, async (route) => {
      const cart = Array.isArray(body.course_ids);
      const response = await invoke(`${route.gateway}-${cart ? "cart-" : ""}initialize`, { ...body, currency: route.currency });
      return response;
    });
  }
  if (result.status < 200 || result.status >= 300 || result.data.error) throw new Error(result.data.error || "Unable to start checkout.");
  return result.data;
}
