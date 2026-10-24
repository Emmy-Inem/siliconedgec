import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { CheckoutElementsProvider, ExpressCheckoutElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import { supabase } from "@/integrations/supabase/client";
import { initializeNativeWalletCheckout, type NativeWalletSession, type WalletCheckoutRequest } from "@/lib/native-wallet-checkout";

const fallback = <p className="text-xs text-center text-muted-foreground">Continue below for cards and available payment methods.</p>;

function WalletButtons({ session, disabled, onProcessingChange }: { session: NativeWalletSession; disabled?: boolean; onProcessingChange?: (processing: boolean) => void }) {
  const state = useCheckoutElements();
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  if (state.type === "error") return fallback;
  return (
    <div className="space-y-2">
      {available && <p className="text-sm text-center font-medium">
        Wallet total: {new Intl.NumberFormat(undefined, { style: "currency", currency: session.currency }).format(session.total)} {session.currency}
      </p>}
      <div aria-hidden={!available} className={available ? undefined : "h-0 overflow-hidden invisible"} {...(disabled || confirming ? { inert: "" } : {})}>
        <ExpressCheckoutElement
          options={{
            buttonHeight: 48,
            buttonTheme: { applePay: "black", googlePay: "black" },
            buttonType: { applePay: "check-out", googlePay: "checkout" },
            layout: { maxColumns: 2, maxRows: 2, overflow: "never" },
            paymentMethodOrder: ["apple_pay", "google_pay"],
            paymentMethods: { applePay: "auto", googlePay: "auto", link: "never", paypal: "never", amazonPay: "never", klarna: "never" },
          }}
          onAvailablePaymentMethodsChange={({ paymentMethods }) => setAvailable(Boolean(paymentMethods?.applePay || paymentMethods?.googlePay))}
          onLoadError={() => setAvailable(false)}
          onConfirm={async (event) => {
            if (disabled || confirming || state.type !== "success") {
              event.paymentFailed({ reason: "fail" });
              return;
            }
            setConfirming(true);
            onProcessingChange?.(true);
            setError("");
            try {
              const result = await state.checkout.confirm({ expressCheckoutConfirmEvent: event, returnUrl: session.returnUrl, redirect: "if_required" });
              if (result.type === "error") setError(result.error.message || "Please try another payment method.");
              else window.location.assign(session.returnUrl);
            } catch {
              setError("Payment could not be confirmed. Please try again.");
            } finally {
              setConfirming(false);
              onProcessingChange?.(false);
            }
          }}
        />
      </div>
      {!available && fallback}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export default function NativeWalletCheckout({ request, userId, disabled, onProcessingChange }: { request: WalletCheckoutRequest; userId: string; disabled?: boolean; onProcessingChange?: (processing: boolean) => void }) {
  const { data: config } = useQuery({
    queryKey: ["stripe-wallet-config", userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-wallet-config", { body: {} });
      return !error && data?.available && /^pk_(live|test)_/.test(data.publishable_key) ? data.publishable_key as string : null;
    },
    staleTime: 5 * 60 * 1000, retry: false,
  });
  const { data: session } = useQuery({
    queryKey: ["native-wallet-session", userId, request],
    queryFn: () => initializeNativeWalletCheckout(request),
    enabled: Boolean(config) && !disabled,
    staleTime: 20 * 60 * 1000, gcTime: 20 * 60 * 1000, retry: false, refetchOnWindowFocus: false,
  });
  const stripe = useMemo(() => config ? loadStripe(config) : null, [config]);
  if (!stripe || !session) return fallback;
  return <CheckoutElementsProvider key={session.sessionId} stripe={stripe} options={{ clientSecret: session.clientSecret }}>
    <WalletButtons session={session} disabled={disabled} onProcessingChange={onProcessingChange} />
  </CheckoutElementsProvider>;
}
