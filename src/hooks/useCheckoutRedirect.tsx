import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";

interface CheckoutSession { authorization_url?: string; currency?: string; total?: number; amount?: number }

export function useCheckoutRedirect() {
  const [pending, setPending] = useState<{ url: string; total: number } | null>(null);
  const redirect = (session: CheckoutSession, requestedCurrency: string) => {
    const currency = session.currency?.toUpperCase();
    if (!session.authorization_url || !currency || (currency !== requestedCurrency && currency !== "USD")) {
      throw new Error("Unable to confirm the payment currency. Please try again.");
    }
    if (currency !== requestedCurrency) {
      const total = Number(session.total ?? session.amount);
      if (!Number.isFinite(total) || total <= 0) throw new Error("Unable to confirm the payment total. Please try again.");
      setPending({ url: session.authorization_url, total });
      return;
    }
    window.location.href = session.authorization_url;
  };
  const confirmation = (
    <AlertDialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Continue in USD</AlertDialogTitle>
          <AlertDialogDescription>
            This payment option is available in USD. Review the total before continuing securely.
            {pending && <span className="block mt-3 font-semibold">Total: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(pending.total)} USD</span>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go back</AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (pending) window.location.href = pending.url; }}>Continue to payment</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { redirect, confirmation };
}
