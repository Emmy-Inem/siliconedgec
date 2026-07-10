import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Loader2, Gift } from "lucide-react";

export default function Refer() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/sign-in?redirect=/refer" replace />;

  const link = `${origin}/?utm_source=referral&utm_medium=friend&utm_campaign=refer&utm_content=${user.id.slice(0, 8)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: "Share it with friends to earn rewards." });
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Level up with Silicon Edge", text: "Join me on Silicon Edge Consulting", url: link });
      } catch {}
    } else {
      copy();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Refer & Earn" description="Share Silicon Edge with friends and earn rewards on every successful enrollment." canonical="/refer" />
      <Header />
      <main className="container mx-auto px-5 sm:px-6 pt-20 pb-12 max-w-2xl">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Gift className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2">Refer & Earn</h1>
          <p className="text-muted-foreground mb-6">Share your unique link. We track every enrollment that comes from you.</p>
          <div className="flex items-center gap-2 bg-muted rounded-lg p-2 mb-4">
            <input readOnly value={link} className="flex-1 bg-transparent text-xs sm:text-sm px-2 outline-none" />
            <Button size="sm" variant="outline" onClick={copy}><Copy className="h-4 w-4" /></Button>
          </div>
          <Button onClick={share} className="w-full"><Share2 className="h-4 w-4 mr-2" />Share link</Button>
          <p className="text-xs text-muted-foreground mt-6">Rewards are credited automatically when your referrals complete a paid enrollment.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}