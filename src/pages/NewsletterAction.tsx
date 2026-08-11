import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, MailX } from "lucide-react";

export default function NewsletterAction({ mode }: { mode: "confirm" | "unsubscribe" }) {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    (async () => {
      if (!token) return setState("error");
      const { data, error } = await supabase.rpc(
        mode === "confirm" ? "newsletter_confirm" : "newsletter_unsubscribe",
        { _token: token } as never,
      );
      setState(!error && data ? "ok" : "error");
    })();
  }, [token, mode]);

  const isConfirm = mode === "confirm";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={isConfirm ? "Confirm your subscription" : "Unsubscribe"}
        description="Manage your Silicon Edge Consulting newsletter preferences."
        canonical={isConfirm ? "/newsletter/confirm" : "/newsletter/unsubscribe"}
      />
      <Header />
      <main className="container mx-auto px-5 sm:px-6 py-24 flex justify-center">
        <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-10">
          {state === "loading" && <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />}
          {state === "ok" && (
            <>
              {isConfirm ? (
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
              ) : (
                <MailX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              )}
              <h1 className="font-heading text-2xl font-bold mb-2">
                {isConfirm ? "You're subscribed!" : "You've been unsubscribed"}
              </h1>
              <p className="text-muted-foreground text-sm mb-6">
                {isConfirm
                  ? "Thanks for confirming. Expect career tips, new cohorts and training updates."
                  : "You won't receive further newsletters from us. You can resubscribe any time."}
              </p>
              <Button asChild><Link to="/courses">Browse courses</Link></Button>
            </>
          )}
          {state === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="font-heading text-2xl font-bold mb-2">Link not valid</h1>
              <p className="text-muted-foreground text-sm mb-6">
                This link is invalid or has already been used.
              </p>
              <Button asChild variant="outline"><Link to="/">Back home</Link></Button>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}