import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Loader2, ArrowLeft, ShoppingBag, Tag, CheckCircle2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/format-currency";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";
import { trackLead } from "@/lib/track-lead";
import { downloadReceiptPdf } from "@/lib/receipt-pdf";
import { tikTokEvent, metaEvent, googleAdsConversion, setGoogleAdsUserData } from "@/lib/analytics";
import { usePublicAccessMode } from "@/hooks/usePublicAccessMode";

export default function Cart() {
  const { items, count, total, removeFromCart, clearCart, loading, refresh } = useCart();
  const { user } = useAuth();
  const { data: publicAccess } = usePublicAccessMode();
  const { format: formatPrice, isNgn } = useLocalizedPrice();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    id: string; code: string; discount_type: string; discount_value: number;
  } | null>(null);

  const discountAmount = appliedPromo
    ? appliedPromo.discount_type === "percentage"
      ? Math.round((total * appliedPromo.discount_value) / 100 * 100) / 100
      : Math.min(appliedPromo.discount_value, total)
    : 0;
  const finalTotal = Math.max(0, Math.round((total - discountAmount) * 100) / 100);

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const { data: rows, error } = await (supabase.rpc as any)("validate_promo_code", { p_code: code });
      if (error) throw error;
      const data = Array.isArray(rows) ? rows[0] : rows;
      if (!data) { setPromoError("Invalid or expired promo code"); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { setPromoError("This promo code has expired"); return; }
      if (data.max_uses && data.usage_count >= data.max_uses) { setPromoError("This promo code has reached its usage limit"); return; }
      const scope: string[] = Array.isArray(data.course_ids) ? data.course_ids : [];
      if (scope.length > 0) {
        const cartCourseIds = items.map((i) => i.course_id);
        const allInScope = cartCourseIds.every((id) => scope.includes(id));
        if (!allInScope) {
          setPromoError("This promo code doesn't apply to one or more courses in your cart");
          return;
        }
      }
      setAppliedPromo({
        id: data.id, code: data.code,
        discount_type: data.discount_type, discount_value: data.discount_value,
      });
      toast({ title: "Promo applied", description: `Code ${data.code} unlocked.` });
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

  // After Paystack redirect: ?reference=... -> verify and issue receipt
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (!reference || !user) return;
    (async () => {
      setProcessing(true);
      try {
        const { data, error } = await supabase.functions.invoke("paystack-cart-verify", { body: { reference } });
        if (error) throw error;
        if (!data?.verified) {
          toast({ title: "Payment not completed", description: data?.message ?? "Please try again.", variant: "destructive" });
          return;
        }
        // Build receipt
        const courseIds: string[] = data.course_ids ?? [];
        const { data: courses } = await supabase.from("courses").select("id, title, price, discount_price").in("id", courseIds);
        const lines = (courses ?? []).map((c: any) => ({
          title: c.title,
          amount: Number(c.discount_price ?? c.price),
        }));
        downloadReceiptPdf({
          reference,
          customerName: user.user_metadata?.full_name ?? "",
          customerEmail: user.email ?? "",
          lines,
          total: Number(data.total ?? lines.reduce((s, l) => s + l.amount, 0)),
        });
        // TikTok conversion: paid checkout completed.
        tikTokEvent("CompletePayment", {
          content_type: "product_group",
          contents: lines.map((l, i) => ({
            content_id: courseIds[i],
            content_name: l.title,
            quantity: 1,
            price: l.amount,
          })),
          value: Number(data.total ?? lines.reduce((s, l) => s + l.amount, 0)),
          currency: "NGN",
          description: reference,
        });
        // Meta Pixel: paid checkout maps to the canonical `Purchase` event,
        // which is what Meta Ads optimisation uses for conversion bidding.
        metaEvent("Purchase", {
          content_ids: courseIds,
          content_type: "product",
          contents: lines.map((l, i) => ({
            id: courseIds[i],
            quantity: 1,
            item_price: l.amount,
          })),
          value: Number(data.total ?? lines.reduce((s, l) => s + l.amount, 0)),
          currency: "NGN",
          order_id: reference,
        });
        // Google Ads: paid checkout is the primary conversion. We pass
        // `transaction_id: reference` so Paystack's reference doubles as
        // the dedup key against any future server-side conversion import.
        void setGoogleAdsUserData({
          email: user.email,
          phone: (user.user_metadata as any)?.phone ?? null,
        });
        googleAdsConversion("Purchase", {
          value: Number(data.total ?? lines.reduce((s, l) => s + l.amount, 0)),
          currency: "NGN",
          transaction_id: reference,
          items: lines.map((l, i) => ({ id: courseIds[i], name: l.title, price: l.amount })),
        });
        // Internal attribution: log a paid_enrollment lead per course so
        // Marketing Analytics can attribute paid conversions to UTM source.
        for (const cid of courseIds) {
          await trackLead({
            formType: "paid_enrollment",
            formData: { course_id: cid, order_ref: reference, amount: data.total },
          }).catch(() => {});
        }
        await refresh();
        toast({
          title: "Payment confirmed",
          description: `Receipt downloading. Verify at /verify-receipt/${reference}`,
        });
        navigate("/dashboard", { replace: true });
      } catch (e: any) {
        toast({ title: "Verification failed", description: e?.message ?? "Try again.", variant: "destructive" });
      } finally {
        setProcessing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCheckout = () => {
    if (!user && !publicAccess) { navigate("/sign-in"); return; }
    if (!user && publicAccess) {
      toast({ title: "Sign in to checkout", description: "Public access lets you browse — sign in to complete a purchase." });
      navigate("/sign-in");
      return;
    }
    if (finalTotal === 0) { handleFreeEnroll(); return; }
    handlePaidCheckout();
  };

  const handlePaidCheckout = async () => {
    setProcessing(true);
    try {
      const { getStoredUtmParams } = await import("@/hooks/useUtmTracking");
      const utm = getStoredUtmParams();
      // Fire BEFORE the redirect so iOS in-app browsers (which kill in-flight
      // requests on navigation) still get the InitiateCheckout signal.
      tikTokEvent("InitiateCheckout", {
        content_type: "product_group",
        contents: items.map((i) => ({ content_id: i.course_id, quantity: 1 })),
        value: total,
        currency: "NGN",
      });
      metaEvent("InitiateCheckout", {
        content_ids: items.map((i) => i.course_id),
        content_type: "product",
        num_items: items.length,
        value: total,
        currency: "NGN",
      });
      googleAdsConversion("InitiateCheckout", {
        value: total,
        currency: "NGN",
        items: items.map((i) => ({ id: i.course_id, quantity: 1 })),
      });
      const { data, error } = await supabase.functions.invoke("paystack-cart-initialize", {
        body: {
          course_ids: items.map((i) => i.course_id),
          callback_url: `${window.location.origin}/cart`,
          utm,
          promo_code_id: appliedPromo?.id ?? null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.free) {
        await clearCart();
        toast({ title: "Enrolled successfully!" });
        navigate("/dashboard");
        return;
      }
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }
      throw new Error("Unexpected response from payment provider");
    } catch (e: any) {
      const msg = e?.message ?? "Try again.";
      const notConfigured = /paystack/i.test(msg) && /not configured|secret/i.test(msg);
      toast({
        title: notConfigured ? "Checkout temporarily unavailable" : "Checkout failed",
        description: notConfigured
          ? "Payments are being set up. Please check back shortly or contact support."
          : msg,
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const handleFreeEnroll = async () => {
    if (!user) return;
    setProcessing(true);
    const courseIds: string[] = [];
    for (const item of items) {
      await supabase.from("enrollments").upsert(
        { user_id: user.id, course_id: item.course_id, payment_status: "confirmed", progress_percentage: 0 },
        { onConflict: "user_id,course_id" }
      ).select();
      courseIds.push(item.course_id);
    }

    // Track lead with UTM attribution (UTMs auto-attached by trackLead)
    for (const courseId of courseIds) {
      await trackLead({ formType: "enrollment", formData: { course_id: courseId } });
    }
    // TikTok conversion: free enrollment counts as a CompleteRegistration.
    tikTokEvent("CompleteRegistration", {
      content_type: "product_group",
      contents: courseIds.map((id) => ({ content_id: id, quantity: 1 })),
      value: 0,
      currency: "NGN",
    });
    metaEvent("CompleteRegistration", {
      content_ids: courseIds,
      content_type: "product",
      value: 0,
      currency: "NGN",
    });
    void setGoogleAdsUserData({
      email: user?.email,
      phone: (user?.user_metadata as any)?.phone ?? null,
    });
    googleAdsConversion("CompleteRegistration", {
      value: 0,
      currency: "NGN",
      items: courseIds.map((id) => ({ id })),
    });

    await clearCart();
    setProcessing(false);
    toast({ title: "Enrolled successfully!", description: "You can now access your courses from the dashboard." });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-hero gradient-mesh pt-28 pb-12 relative overflow-hidden">
        <div className="noise-overlay" />
        <div className="container mx-auto px-4">
          <Link to="/courses" className="inline-flex items-center text-hero-muted hover:text-primary text-sm mb-5 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" /> Continue Shopping
          </Link>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] lg:items-end">
            <div>
              <h1 className="font-heading text-3xl md:text-5xl font-bold text-hero flex flex-wrap items-center gap-3">
                <ShoppingCart className="h-8 w-8" />
                Your Cart
                {count > 0 && <span className="text-lg text-hero-muted font-normal">({count} course{count !== 1 ? "s" : ""})</span>}
              </h1>
              <p className="text-hero-muted text-lg mt-3 max-w-2xl">Review your selected programs, confirm pricing in Naira, and head to checkout when you’re ready.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-hero-muted text-xs uppercase tracking-[0.18em] mb-1">Order snapshot</p>
                  <p className="font-heading text-2xl text-hero">{formatPrice(total)}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-hero-muted text-[11px] uppercase tracking-[0.16em]">Items</p>
                  <p className="mt-1 font-heading text-xl text-hero">{count}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-hero-muted text-[11px] uppercase tracking-[0.16em]">Currency</p>
                  <p className="mt-1 font-heading text-xl text-hero">NGN</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 page-transition">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : count === 0 ? (
            <div className="text-center py-20 glass-card rounded-3xl border border-border/60 shadow-[0_18px_50px_-24px_hsl(var(--foreground)/0.35)]">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-heading text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Browse our courses and add some to your cart.</p>
              <Button asChild><Link to="/courses">Browse Courses</Link></Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                      className="flex gap-4 glass-card rounded-2xl border border-border/60 p-4 hover:shadow-[0_18px_50px_-24px_hsl(var(--foreground)/0.35)] transition-shadow"
                  >
                    <div className="w-28 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {item.course?.thumbnail_url ? (
                        <img src={item.course.thumbnail_url} alt={item.course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/courses/${item.course_id}`} className="font-heading font-semibold text-sm hover:text-primary transition-colors line-clamp-2">
                        {item.course?.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.course?.instructor?.name ?? "Instructor"}
                      </p>
                      <p className="font-heading font-bold text-primary mt-2 text-sm">
                        {formatPrice(item.course?.price ?? 0)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.course_id)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 self-start"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                 <div className="glass-card rounded-2xl border border-border/60 p-6 space-y-4 sticky top-24 shadow-[0_18px_50px_-24px_hsl(var(--foreground)/0.35)]">
                  <h3 className="font-heading font-semibold text-lg">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal ({count} course{count !== 1 ? "s" : ""})</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    {appliedPromo && (
                      <div className="flex justify-between text-primary">
                        <span>Discount ({appliedPromo.code})</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Promo code */}
                  <div className="space-y-2">
                    {appliedPromo ? (
                      <div className="flex items-center justify-between bg-accent/40 border border-accent rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {appliedPromo.code} — {appliedPromo.discount_type === "percentage"
                              ? `${appliedPromo.discount_value}% off`
                              : `${formatPrice(appliedPromo.discount_value)} off`}
                          </span>
                        </div>
                        <button onClick={removePromo} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Promo code"
                            value={promoInput}
                            onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                            className="pl-9 uppercase"
                            onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                          />
                        </div>
                        <Button variant="outline" onClick={applyPromo} disabled={!promoInput.trim() || promoLoading}>
                          {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                    )}
                    {promoError && <p className="text-xs text-destructive">{promoError}</p>}
                  </div>

                  <Separator />
                  <div className="flex justify-between font-heading font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(finalTotal)}</span>
                  </div>
                  {!isNgn && finalTotal > 0 && (
                    <p className="text-[11px] text-muted-foreground -mt-2">Charged in {formatNaira(finalTotal)} (NGN) at checkout.</p>
                  )}
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleCheckout}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                    {processing ? "Processing..." : finalTotal === 0 ? "Enroll for Free" : "Checkout"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
