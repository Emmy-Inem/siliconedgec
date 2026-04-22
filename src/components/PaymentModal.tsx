import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, Lock, Tag, CheckCircle2, X } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/format-currency";

interface PromoResult {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  influencer_name: string;
}

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  price: number;
  onPaymentSuccess: () => void;
}

export function PaymentModal({ open, onOpenChange, courseId, courseTitle, price, onPaymentSuccess }: PaymentModalProps) {
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState("");

  // Auto-apply pending promo from short influencer link (sessionStorage.pending_promo)
  useEffect(() => {
    if (!open) return;
    const pending = sessionStorage.getItem("pending_promo");
    if (pending && !appliedPromo && !promoInput) {
      setPromoInput(pending.toUpperCase());
      // Defer apply so state is updated
      setTimeout(() => {
        applyPromoCodeWith(pending.toUpperCase());
        sessionStorage.removeItem("pending_promo");
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyPromoCodeWith = async (code: string) => {
    if (!code) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("id, code, discount_type, discount_value, influencer_name, max_uses, usage_count, expires_at, is_active")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setPromoError("Invalid or expired promo code"); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { setPromoError("This promo code has expired"); return; }
      if (data.max_uses && data.usage_count >= data.max_uses) { setPromoError("This promo code has reached its usage limit"); return; }
      const calcDiscount = data.discount_type === "percentage"
        ? Math.round((price * data.discount_value) / 100 * 100) / 100
        : Math.min(data.discount_value, price);
      setAppliedPromo({
        id: data.id, code: data.code, discount_type: data.discount_type,
        discount_value: data.discount_value, influencer_name: data.influencer_name,
      });
      toast({ title: "Promo applied", description: `You saved ${formatNaira(calcDiscount)}` });
    } catch {
      setPromoError("Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  const discountAmount = appliedPromo
    ? appliedPromo.discount_type === "percentage"
      ? Math.round((price * appliedPromo.discount_value) / 100 * 100) / 100
      : Math.min(appliedPromo.discount_value, price)
    : 0;

  const finalPrice = Math.max(0, Math.round((price - discountAmount) * 100) / 100);

  const applyPromoCode = () => applyPromoCodeWith(promoInput.trim().toUpperCase());

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  };

  const handlePay = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          course_id: courseId,
          promo_code_id: appliedPromo?.id ?? null,
          callback_url: `${window.location.origin}/courses/${courseId}?verify=1`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Free path (100% promo)
      if (data?.free) {
        toast({ title: "Enrollment confirmed", description: `You're enrolled in ${courseTitle}.` });
        onPaymentSuccess();
        onOpenChange(false);
        return;
      }

      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }
      throw new Error("Unexpected response from payment provider");
    } catch (e: any) {
      toast({
        title: "Payment unavailable",
        description: e?.message ?? "Could not start payment. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="bg-primary/5 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Complete enrollment</DialogTitle>
          </DialogHeader>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground line-clamp-1">{courseTitle}</span>
            <div className="text-right">
              {appliedPromo ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm line-through text-muted-foreground">{formatNaira(price)}</span>
                  <span className="font-heading text-2xl font-bold text-primary">{formatNaira(finalPrice)}</span>
                </div>
              ) : (
                <span className="font-heading text-2xl font-bold text-primary">{formatNaira(price)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Promo */}
          <div className="space-y-2">
            {appliedPromo ? (
              <div className="flex items-center justify-between bg-accent/40 border border-accent rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {appliedPromo.code} — {appliedPromo.discount_type === "percentage" ? `${appliedPromo.discount_value}% off` : `${formatNaira(appliedPromo.discount_value)} off`}
                  </span>
                </div>
                <button onClick={removePromo} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter promo code"
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                    className="pl-9 uppercase"
                    onKeyDown={(e) => e.key === "Enter" && applyPromoCode()}
                  />
                </div>
                <Button variant="outline" onClick={applyPromoCode} disabled={!promoInput.trim() || promoLoading} className="flex-shrink-0">
                  {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
            {promoError && <p className="text-xs text-destructive">{promoError}</p>}
          </div>

          {appliedPromo && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatNaira(price)}</span></div>
              <div className="flex justify-between text-primary"><span>Discount ({appliedPromo.code})</span><span>-{formatNaira(discountAmount)}</span></div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold"><span>Total</span><span className="text-primary">{formatNaira(finalPrice)}</span></div>
            </div>
          )}

          <Separator />

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
            <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Shield className="h-4 w-4 text-primary" /> Secure checkout via Paystack
              </div>
              <p className="text-xs text-muted-foreground">
                You'll be redirected to Paystack's PCI-compliant checkout. Pay with card, bank transfer, or USSD.
              </p>
            </div>
            <Button className="w-full gap-2" size="lg" onClick={handlePay} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {processing ? "Redirecting..." : finalPrice === 0 ? "Enroll for Free" : `Pay ${formatNaira(finalPrice)}`}
            </Button>
          </motion.div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Shield className="h-3.5 w-3.5" />
            <span>256-bit SSL · Powered by Paystack</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
