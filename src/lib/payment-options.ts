import { checkoutRoutes } from "../../supabase/functions/_shared/payment-routing";

/** Keep the visible payment options aligned with the preferred local-currency route. */
export function usesLocalPaymentOptions(currency: string): boolean {
  return checkoutRoutes(currency)[0].gateway === "paystack";
}
