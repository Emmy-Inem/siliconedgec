import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Loader2, Shield, Lock, Tag, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/format-currency";

type PaymentMethod = "card" | "paystack" | "google-pay";

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
  courseTitle: string;
  price: number;
  onPaymentSuccess: () => void;
}

export function PaymentModal({ open, onOpenChange, courseTitle, price, onPaymentSuccess }: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState("");

  const discountAmount = appliedPromo
    ? appliedPromo.discount_type === "percentage"
      ? Math.round((price * appliedPromo.discount_value) / 100 * 100) / 100
      : Math.min(appliedPromo.discount_value, price)
    : 0;

  const finalPrice = Math.max(0, Math.round((price - discountAmount) * 100) / 100);

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const applyPromoCode = async () => {
    const code = promoInput.trim().toUpperCase();
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
      if (!data) {
        setPromoError("Invalid or expired promo code");
        setPromoLoading(false);
        return;
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError("This promo code has expired");
        setPromoLoading(false);
        return;
      }

      // Check usage limit
      if (data.max_uses && data.usage_count >= data.max_uses) {
        setPromoError("This promo code has reached its usage limit");
        setPromoLoading(false);
        return;
      }

      setAppliedPromo({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        influencer_name: data.influencer_name,
      });
      toast({ title: "Promo code applied!", description: `You saved $${appliedPromo ? discountAmount : data.discount_type === "percentage" ? Math.round((price * data.discount_value) / 100 * 100) / 100 : Math.min(data.discount_value, price)}` });
    } catch {
      setPromoError("Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  };

  const handleSubmit = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setProcessing(false);
    toast({ title: "Payment successful!", description: `You've been enrolled in ${courseTitle}.` });
    onPaymentSuccess();
    onOpenChange(false);
  };

  const handleGooglePay = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setProcessing(false);
    toast({ title: "Payment successful!", description: `Google Pay payment confirmed for ${courseTitle}.` });
    onPaymentSuccess();
    onOpenChange(false);
  };

  const handlePaystack = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setProcessing(false);
    toast({ title: "Payment successful!", description: `Paystack payment confirmed for ${courseTitle}.` });
    onPaymentSuccess();
    onOpenChange(false);
  };

  const isCardValid = cardNumber.replace(/\s/g, "").length === 16 && expiry.length === 5 && cvc.length >= 3 && name.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground line-clamp-1">{courseTitle}</span>
            <div className="text-right">
              {appliedPromo ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm line-through text-muted-foreground">${price}</span>
                  <span className="font-heading text-2xl font-bold text-primary">${finalPrice}</span>
                </div>
              ) : (
                <span className="font-heading text-2xl font-bold text-primary">${price}</span>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Promo Code Section */}
          <div className="space-y-2">
            {appliedPromo ? (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {appliedPromo.code} — {appliedPromo.discount_type === "percentage" ? `${appliedPromo.discount_value}% off` : `$${appliedPromo.discount_value} off`}
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
                <Button
                  variant="outline"
                  onClick={applyPromoCode}
                  disabled={!promoInput.trim() || promoLoading}
                  className="flex-shrink-0"
                >
                  {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
            {promoError && <p className="text-xs text-destructive">{promoError}</p>}
          </div>

          {/* Price breakdown when promo applied */}
          {appliedPromo && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${price}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount ({appliedPromo.code})</span>
                <span>-${discountAmount}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">${finalPrice}</span>
              </div>
            </div>
          )}

          {/* Payment method selector */}
          <div className="grid grid-cols-3 gap-2">
            <MethodButton active={method === "card"} onClick={() => setMethod("card")} label="Card" icon={<CreditCard className="h-4 w-4" />} />
            <MethodButton active={method === "paystack"} onClick={() => setMethod("paystack")} label="Paystack" icon={<PaystackIcon />} />
            <MethodButton active={method === "google-pay"} onClick={() => setMethod("google-pay")} label="Google Pay" icon={<GooglePayIcon />} />
          </div>

          <Separator />

          {/* Payment forms */}
          <AnimatePresence mode="wait">
            {method === "card" && (
              <motion.div key="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="card-name">Cardholder Name</Label>
                  <Input id="card-name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-number">Card Number</Label>
                  <div className="relative">
                    <Input id="card-number" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} className="pr-12" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                      <VisaIcon /><MastercardIcon />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry</Label>
                    <Input id="expiry" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input id="cvc" placeholder="123" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                  </div>
                </div>
                <Button className="w-full gap-2" size="lg" onClick={handleSubmit} disabled={!isCardValid || processing}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {processing ? "Processing..." : `Pay $${finalPrice}`}
                </Button>
              </motion.div>
            )}

            {method === "paystack" && (
              <motion.div key="paystack" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-[hsl(197,100%,47%)]/10 rounded-full flex items-center justify-center">
                    <PaystackIcon size={32} />
                  </div>
                  <p className="text-sm text-muted-foreground">You'll be redirected to Paystack's secure checkout to complete your payment in Naira (₦) or card.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ps-email">Email</Label>
                  <Input id="ps-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button className="w-full gap-2" size="lg" onClick={handlePaystack} disabled={!email || processing} style={{ background: "hsl(197, 100%, 47%)" }}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PaystackIcon size={18} />}
                  {processing ? "Redirecting..." : `Pay with Paystack — $${finalPrice}`}
                </Button>
              </motion.div>
            )}

            {method === "google-pay" && (
              <motion.div key="google-pay" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-foreground/5 rounded-full flex items-center justify-center">
                    <GooglePayIcon size={32} />
                  </div>
                  <p className="text-sm text-muted-foreground">Complete your payment instantly with Google Pay. Fast, secure, and convenient.</p>
                </div>
                <Button className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90" size="lg" onClick={handleGooglePay} disabled={processing}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GooglePayIcon size={18} />}
                  {processing ? "Processing..." : `Pay $${finalPrice} with Google Pay`}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Security footer */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Shield className="h-3.5 w-3.5" />
            <span>Secured with 256-bit SSL encryption</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --- Sub-components --- */

function MethodButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-all ${
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/30"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PaystackIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="hsl(197, 100%, 47%)" />
      <path d="M6 7h12M6 11h12M6 15h8M6 19h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GooglePayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12.24 10.285V14.4h5.54c-.24 1.52-1.82 4.44-5.54 4.44-3.34 0-6.06-2.76-6.06-6.16s2.72-6.16 6.06-6.16c1.9 0 3.18.82 3.9 1.52l2.66-2.56C17.14 3.94 14.88 3 12.24 3 7.14 3 3 7.04 3 12.16s4.14 9.16 9.24 9.16c5.34 0 8.88-3.76 8.88-9.04 0-.6-.06-1.06-.14-1.52H12.24z" fill="currentColor"/>
    </svg>
  );
}

function VisaIcon() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect width="24" height="16" rx="2" fill="hsl(var(--muted))" />
      <text x="4" y="11" fontSize="7" fontWeight="bold" fill="hsl(230, 80%, 40%)" fontFamily="sans-serif">VISA</text>
    </svg>
  );
}

function MastercardIcon() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
      <rect width="24" height="16" rx="2" fill="hsl(var(--muted))" />
      <circle cx="10" cy="8" r="4" fill="hsl(0, 80%, 55%)" opacity="0.8" />
      <circle cx="14" cy="8" r="4" fill="hsl(35, 100%, 50%)" opacity="0.8" />
    </svg>
  );
}
