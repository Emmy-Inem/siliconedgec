import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MailWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function VerifyEmailBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (!user || (user as any).email_confirmed_at || dismissed) return null;

  const resend = async () => {
    setSending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email ?? "" });
    setSending(false);
    if (error) toast({ title: "Couldn't resend", description: error.message, variant: "destructive" });
    else toast({ title: "Verification email sent", description: "Check your inbox to confirm your email." });
  };

  return (
    <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 p-4 flex items-center gap-3 mb-4">
      <MailWarning className="h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-medium">Verify your email address</p>
        <p className="text-xs opacity-90">Confirm {user.email} so we can reach you about your courses and reset your password if you ever get locked out.</p>
      </div>
      <Button size="sm" variant="outline" onClick={resend} disabled={sending}>
        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Resend"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>Dismiss</Button>
    </div>
  );
}