import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const FLAG_KEY = "sec_show_signup_prompt";

interface PromptPayload {
  influencer?: string;
  slug?: string;
}

function readPayload(): PromptPayload | null {
  try {
    const raw = sessionStorage.getItem(FLAG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PromptPayload;
  } catch {
    return null;
  }
}

/**
 * Shows a one-time signup CTA to unauthenticated visitors who arrived via an
 * influencer redirect link (/r/:slug). The flag is set by RedirectInfluencer
 * and consumed once the user is signed in or dismisses the prompt.
 */
export function InfluencerSignupPrompt() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<PromptPayload | null>(null);

  useEffect(() => {
    if (loading) return;
    if (user) {
      // Authenticated → no prompt needed; clear any stale flag.
      sessionStorage.removeItem(FLAG_KEY);
      setOpen(false);
      return;
    }
    // Don't show on the redirect page itself or on auth pages.
    if (
      location.pathname.startsWith("/r/") ||
      location.pathname.startsWith("/sign-in") ||
      location.pathname.startsWith("/sign-up") ||
      location.pathname.startsWith("/reset-password")
    ) {
      return;
    }
    const data = readPayload();
    if (data) {
      setPayload(data);
      // Small delay so the destination page is visible behind the modal.
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [user, loading, location.pathname]);

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next) sessionStorage.removeItem(FLAG_KEY);
  };

  if (!payload) return null;
  const name = payload.influencer?.trim() || "a Silicon Edge partner";
  // Destination to return to after auth — the page they landed on (or the
  // value stashed by RedirectInfluencer).
  let dest = "";
  try {
    dest =
      sessionStorage.getItem("sec_post_auth_redirect") ||
      location.pathname + location.search;
  } catch {
    dest = location.pathname + location.search;
  }
  const redirectQS = dest ? `?redirect=${encodeURIComponent(dest)}` : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            Welcome — invited by {name}
          </DialogTitle>
          <DialogDescription className="text-center">
            Create a free Silicon Edge Consulting account to enroll in courses,
            register for free webinars, and unlock partner offers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full" onClick={() => handleClose(false)}>
            <Link to={`/sign-up${redirectQS}`}>Create free account</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full"
            onClick={() => handleClose(false)}
          >
            <Link to={`/sign-in${redirectQS}`}>I already have an account</Link>
          </Button>
          <button
            type="button"
            className="mt-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => handleClose(false)}
          >
            Continue browsing
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}