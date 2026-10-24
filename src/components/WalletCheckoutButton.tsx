import { lazy, Suspense } from "react";
import { usesLocalPaymentOptions } from "@/lib/payment-options";
import type { WalletCheckoutRequest } from "@/lib/native-wallet-checkout";

const NativeWalletCheckout = lazy(() => import("./NativeWalletCheckout"));

interface WalletCheckoutButtonProps {
  currency: string;
  ready: boolean;
  request: WalletCheckoutRequest;
  userId?: string;
  onProcessingChange?: (processing: boolean) => void;
  disabled?: boolean;
  processing?: boolean;
}

/** Local markets keep their preferred provider; eligible international devices get official wallets. */
export function WalletCheckoutButton({ currency, ready, request, userId, disabled, processing, onProcessingChange }: WalletCheckoutButtonProps) {
  if (!ready) return null;
  if (usesLocalPaymentOptions(currency)) {
    return (
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium">Local payment options</p>
        <p className="text-xs text-muted-foreground">
          Continue below to see the payment methods available for your region in {currency}.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-center">International payment options</p>
      {userId && <Suspense fallback={null}>
        <NativeWalletCheckout request={request} userId={userId} disabled={disabled || processing} onProcessingChange={onProcessingChange} />
      </Suspense>}
    </div>
  );
}
