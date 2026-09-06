import { SEO } from "@/components/SEO";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { logUserActivity } from "@/lib/user-activity";
import { z } from "zod";
import logoDark from "@/assets/logo-dark.png";

const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const redirectTo = (() => {
    const fromQuery = searchParams.get("redirect");
    if (fromQuery) return fromQuery;
    try {
      return sessionStorage.getItem("sec_post_auth_redirect") || "/";
    } catch {
      return "/";
    }
  })();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as "email" | "password";
        if (!errs[k]) errs[k] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setLoading(true);

    // Pre-flight: check if this IP is blocked or under lockout BEFORE attempting auth
    try {
      const pre = await supabase.functions.invoke("check-login-attempt", {
        body: { email, success: true, dry_run: true },
      });
      if (pre.data?.ip_blocked) {
        setLoading(false);
        toast({
          title: "Access denied",
          description: "Your network has been blocked. Contact support if this is a mistake.",
          variant: "destructive",
        });
        return;
      }
      if (pre.data?.locked) {
        setLoading(false);
        toast({
          title: "Too many failed attempts",
          description: "Please wait 15 minutes before trying again, or reset your password.",
          variant: "destructive",
        });
        return;
      }
    } catch {}

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // Record outcome
    supabase.functions.invoke("check-login-attempt", {
      body: { email, success: !error },
    }).catch(() => {});
    setLoading(false);
    if (error) {
      const msg = error.message === "Invalid login credentials"
        ? "Invalid email or password. If you signed up with Google, use the Google button below."
        : error.message;
      toast({ title: "Sign in failed", description: msg, variant: "destructive" });
    } else {
      logUserActivity({ action: "login", metadata: { email } });
      try { sessionStorage.removeItem("sec_post_auth_redirect"); } catch {}
      navigate(redirectTo || "/");
    }
  };

  const handleGoogleSignIn = async () => {
    const target = redirectTo && redirectTo !== "/"
      ? `${window.location.origin}${redirectTo}`
      : window.location.origin;
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: target,
    });
    if (error) {
      toast({ title: "Google sign in failed", description: String(error), variant: "destructive" });
    }
  };

  const handleAppleSignIn = async () => {
    const target = redirectTo && redirectTo !== "/"
      ? `${window.location.origin}${redirectTo}`
      : window.location.origin;
    const { error } = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: target,
    });
    if (error) {
      toast({ title: "Apple sign in failed", description: String(error), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Sign In" description="Sign in to continue your live tech training, view certificates and manage your enrollments." />
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
              <h1 className="font-heading text-2xl font-bold">Welcome back<span className="text-gold">.</span></h1>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your Silicon Edge account</p>
            </div>

            <form className="space-y-4" onSubmit={handleSignIn}>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined })); }}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    aria-invalid={!!fieldErrors.email}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {fieldErrors.email && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined })); }}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    aria-invalid={!!fieldErrors.password}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.password}</p>}
              </div>

              <div className="flex justify-end">
                <Link
                  to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground">or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="lg" onClick={handleGoogleSignIn}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={handleAppleSignIn}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Apple
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/sign-up" className="text-primary font-medium hover:underline">Sign up</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
