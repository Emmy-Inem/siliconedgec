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
import { ShoppingCart, Trash2, Loader2, ArrowLeft, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/format-currency";
import { trackLead } from "@/lib/track-lead";
import { downloadReceiptPdf } from "@/lib/receipt-pdf";

export default function Cart() {
  const { items, count, total, removeFromCart, clearCart, loading, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

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
    if (!user) { navigate("/sign-in"); return; }
    if (total === 0) { handleFreeEnroll(); return; }
    handlePaidCheckout();
  };

  const handlePaidCheckout = async () => {
    setProcessing(true);
    try {
      const { getStoredUtmParams } = await import("@/hooks/useUtmTracking");
      const utm = getStoredUtmParams();
      const { data, error } = await supabase.functions.invoke("paystack-cart-initialize", {
        body: {
          course_ids: items.map((i) => i.course_id),
          callback_url: `${window.location.origin}/cart`,
          utm,
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
      toast({ title: "Checkout failed", description: e?.message ?? "Try again.", variant: "destructive" });
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

    await clearCart();
    setProcessing(false);
    toast({ title: "Enrolled successfully!", description: "You can now access your courses from the dashboard." });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-hero pt-28 pb-10">
        <div className="container mx-auto px-4">
          <Link to="/courses" className="inline-flex items-center text-hero-muted hover:text-primary text-sm mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" /> Continue Shopping
          </Link>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-hero flex items-center gap-3">
            <ShoppingCart className="h-8 w-8" />
            Your Cart
            {count > 0 && <span className="text-lg text-hero-muted font-normal">({count} course{count !== 1 ? "s" : ""})</span>}
          </h1>
        </div>
      </section>

      <section className="py-10">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : count === 0 ? (
            <div className="text-center py-20">
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
                    className="flex gap-4 bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
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
                        {formatNaira(item.course?.price ?? 0)}
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
                <div className="bg-card rounded-xl border border-border p-6 space-y-4 sticky top-24">
                  <h3 className="font-heading font-semibold text-lg">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal ({count} course{count !== 1 ? "s" : ""})</span>
                      <span>{formatNaira(total)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-heading font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatNaira(total)}</span>
                  </div>
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleCheckout}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                    {processing ? "Processing..." : "Checkout"}
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
