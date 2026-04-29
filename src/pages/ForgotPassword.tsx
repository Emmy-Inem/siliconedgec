import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import logoDark from "@/assets/logo-dark.png";

const emailSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(254),
});

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      // Don't leak whether the email exists — keep the same success UX
      // and only surface unexpected errors via toast.
      toast({ title: "Could not send link", description: resetError.message, variant: "destructive" });
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card rounded-2xl border border-border p-8 shadow-xl shadow-primary/5"
          >
            <div className="text-center mb-8">
              <img src={logoDark} alt="Silicon Edge" className="h-10 w-auto mx-auto mb-4" />
              <h1 className="font-heading text-2xl font-bold">
                Forgot password<span className="text-gold">?</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {sent
                  ? "If an account exists for that email, a reset link is on its way."
                  : "Enter the email tied to your account and we'll send a reset link."}
              </p>
            </div>

            {sent ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="h-12 w-12 text-primary" />
                <p className="text-sm text-muted-foreground text-center">
                  Check your inbox (and spam folder) for an email from Silicon Edge.
                  The link expires in 60 minutes.
                </p>
                <Button asChild variant="outline" className="mt-2">
                  <Link to="/sign-in"><ArrowLeft className="h-4 w-4 mr-2" /> Back to sign in</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div>
                  <label className="text-sm font-medium mb-1.5 block" htmlFor="email">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                      placeholder="you@example.com"
                      required
                      aria-invalid={!!error}
                      aria-describedby={error ? "email-error" : undefined}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  {error && (
                    <p id="email-error" className="mt-1.5 text-xs text-destructive">{error}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>

                <div className="text-center">
                  <Link to="/sign-in" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
