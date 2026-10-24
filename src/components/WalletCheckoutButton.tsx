import { useId } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usesLocalPaymentOptions } from "@/lib/payment-options";

interface WalletCheckoutButtonProps {
  currency: string;
  ready: boolean;
  onCheckout: () => void;
  disabled?: boolean;
  processing?: boolean;
}

/** A clearly labelled entry to hosted wallet checkout, not an imitation wallet payment sheet. */
export function WalletCheckoutButton({ currency, ready, onCheckout, disabled, processing }: WalletCheckoutButtonProps) {
  const descriptionId = useId();
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
      <Button type="button" variant="outline" size="lg" className="w-full gap-2" disabled={disabled || processing} onClick={onCheckout} aria-describedby={descriptionId}>
        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        {processing ? "Opening checkout…" : "Apple Pay or Google Pay"}
      </Button>
      <p id={descriptionId} className="text-xs text-center text-muted-foreground">
        Choose your wallet on the secure payment page. Available on supported devices.
      </p>
    </div>
  );
}
