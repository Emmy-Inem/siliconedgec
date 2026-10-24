import { useId } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WalletCheckoutButtonProps {
  onCheckout: () => void;
  disabled?: boolean;
  processing?: boolean;
}

/** A clearly labelled entry to hosted wallet checkout, not an imitation wallet payment sheet. */
export function WalletCheckoutButton({ onCheckout, disabled, processing }: WalletCheckoutButtonProps) {
  const descriptionId = useId();
  return (
    <div className="space-y-2">
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
