import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

export function NewsletterSignup({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
        body: { email: email.trim(), source: "signup" },
      });
      if (error) throw error;
      toast({
        title: data?.already ? "You're already subscribed" : "Almost there!",
        description: data?.already
          ? "This email is already on our list."
          : "Check your inbox to confirm your subscription.",
      });
      setEmail("");
    } catch (err: any) {
      toast({ title: "Couldn't subscribe", description: err.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={subscribe} className={compact ? "flex gap-2" : "flex flex-col sm:flex-row gap-2 max-w-md"}>
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-9"
          required
        />
      </div>
      <Button type="submit" disabled={busy}>Subscribe</Button>
    </form>
  );
}