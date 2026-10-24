import { supabase } from "@/integrations/supabase/client";
import { usesLocalPaymentOptions } from "./payment-options";
import { readFunctionError } from "./function-error";
import type { UtmParams } from "@/hooks/useUtmTracking";

export interface WalletCheckoutRequest {
  currency: string;
  course_id?: string;
  course_ids?: string[];
  callback_url: string;
  cancel_url: string;
  promo_code_id?: string | null;
  affiliate_code?: string | null;
  utm?: UtmParams;
}

export interface NativeWalletSession {
  clientSecret: string;
  sessionId: string;
  currency: string;
  total: number;
  returnUrl: string;
}

export async function initializeNativeWalletCheckout(body: WalletCheckoutRequest): Promise<NativeWalletSession> {
  if (usesLocalPaymentOptions(body.currency)) throw new Error("Please use local checkout.");
  const currencies = body.currency === "USD" ? ["USD"] : [body.currency, "USD"];
  for (const currency of currencies) {
    const { data, error } = await supabase.functions.invoke(
      Array.isArray(body.course_ids) ? "stripe-cart-initialize" : "stripe-initialize",
      { body: { ...body, currency, checkout_ui: "elements" } },
    );
    if (error) {
      const response = error.context;
      if (response && typeof response.status === "number" && response.status < 500 && response.status !== 429) {
        const result = await response.clone().json().catch(() => ({}));
        if (!result.retryable) throw await readFunctionError(error);
      }
      continue;
    }
    const total = Number(data?.total ?? data?.amount);
    if (data?.client_secret && data?.session_id && data.currency === currency && Number.isFinite(total) && total > 0) {
      // Existing server verification performs fulfillment after the wallet confirms payment.
      const returnUrl = new URL(body.callback_url);
      returnUrl.searchParams.set("session_id", data.session_id);
      returnUrl.searchParams.set("stripe", "1");
      if (data.reference) returnUrl.searchParams.set("reference", data.reference);
      return { clientSecret: data.client_secret, sessionId: data.session_id, currency, total, returnUrl: returnUrl.href };
    }
    // Never mistake a legacy hosted session for an embedded one or create repeated orders.
    throw new Error("Wallet checkout is not ready. Please use the main checkout button.");
  }
  throw new Error("Wallet checkout is temporarily unavailable.");
}
