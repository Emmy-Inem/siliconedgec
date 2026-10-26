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

/** NGN checkouts route through the standard checkout button; other currencies also offer official device wallets when eligible. */
export function WalletCheckoutButton({ currency, ready, request, userId, disabled, processing, onProcessingChange }: WalletCheckoutButtonProps) {
  if (!ready || usesLocalPaymentOptions(currency)) return null;
  return (
    <div className="space-y-2">
      {userId && <Suspense fallback={null}>
        <NativeWalletCheckout request={request} userId={userId} disabled={disabled || processing} onProcessingChange={onProcessingChange} />
      </Suspense>}
    </div>
  );
}
