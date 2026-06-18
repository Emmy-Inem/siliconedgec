import { useEffect, useRef, useState } from "react";
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
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DISMISSED_KEY = "sec_signup_prompt_dismissed_until";
const DISMISS_COUNT_KEY = "sec_signup_prompt_dismiss_count";
const AUTO_TRIGGER_MS = 10_000; // 10 seconds for first prompt
// Escalating re-prompt schedule after each dismissal. After the array is
// exhausted, the last interval keeps repeating until the user signs up.
const REPROMPT_SCHEDULE_MS = [
  60_000,       // 1 minute after 1st dismissal
  3 * 60_000,   // 3 minutes
  5 * 60_000,   // 5 minutes
  10 * 60_000,  // 10 minutes thereafter
];

const getRepromptDelay = (dismissCount: number) => {
  if (dismissCount <= 0) return REPROMPT_SCHEDULE_MS[0];
  const idx = Math.min(dismissCount - 1, REPROMPT_SCHEDULE_MS.length - 1);
  return REPROMPT_SCHEDULE_MS[idx];
};

type Reason = "auto" | "enroll" | "register" | "bookmark" | "review" | "cart";

/**
 * Global signup CTA for unauthenticated visitors.
 * - Auto-shows after 60s on the site (24h cooldown after dismissal).
 * - Triggered immediately when any UI dispatches `sec:request-signup` —
 *   e.g. clicking Enroll / Add to cart / Bookmark without an account.
 */
export function SignupPromptModal() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("auto");
  const [recheckTick, setRecheckTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cooldownActive = () => {
    try {
      const until = Number(localStorage.getItem(DISMISSED_KEY) || 0);
      return until > Date.now();
    } catch { return false; }
  };

  // Listen for explicit requests (Enroll / Add to cart taps from anon users).
  useEffect(() => {
    const handler = (e: Event) => {
      if (user) return;
      const detail = (e as CustomEvent).detail as { reason?: Reason } | undefined;
      setReason(detail?.reason ?? "enroll");
      setOpen(true);
    };
    window.addEventListener("sec:request-signup", handler as EventListener);
    return () => window.removeEventListener("sec:request-signup", handler as EventListener);
  }, [user]);

  // Auto-show after 10s for anon visitors. After dismissal, re-prompt
  // automatically once the cooldown elapses.
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (loading || user) return;
    if (location.pathname.startsWith("/sign-in") || location.pathname.startsWith("/sign-up") ||
        location.pathname.startsWith("/reset-password") || location.pathname.startsWith("/forgot-password") ||
        location.pathname.startsWith("/r/")) return;
    if (cooldownActive()) {
      let until = 0;
      try { until = Number(localStorage.getItem(DISMISSED_KEY) || 0); } catch {}
      const wait = Math.max(0, until - Date.now()) + 50;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!user && !cooldownActive()) {
          setReason("auto");
          setOpen(true);
        } else {
          setRecheckTick((x) => x + 1);
        }
      }, wait);
    } else {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!user && !cooldownActive()) {
          setReason("auto");
          setOpen(true);
        }
      }, AUTO_TRIGGER_MS);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user, loading, location.pathname, recheckTick]);

  // Kill-switch: if user logs in while a timer is pending, immediately
  // close the modal and cancel any scheduled auto-show.
  useEffect(() => {
    if (user) {
      setOpen(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [user]);

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next) {
      let count = 0;
      try {
        count = Number(localStorage.getItem(DISMISS_COUNT_KEY) || 0) + 1;
        localStorage.setItem(DISMISS_COUNT_KEY, String(count));
        localStorage.setItem(
          DISMISSED_KEY,
          String(Date.now() + getRepromptDelay(count)),
        );
      } catch {}
      // Schedule the next auto re-prompt after the cooldown elapses.
      setRecheckTick((x) => x + 1);
    }
  };

  if (user) return null;

  const dest = location.pathname + location.search;
  const qs = `?redirect=${encodeURIComponent(dest)}`;

  const copy: Record<Reason, { title: string; desc: string }> = {
    auto: {
      title: "Unlock the full Silicon Edge experience",
      desc: "Create a free account to save your favourite courses, enroll, and earn verifiable certificates.",
    },
    enroll: {
      title: "Create an account to enroll",
      desc: "Sign up in seconds to enroll in this course, track progress, and earn your certificate.",
    },
    register: {
      title: "Create an account to register",
      desc: "Free webinars are open to all — just create a quick account so we can save your seat.",
    },
    bookmark: {
      title: "Sign up to save courses",
      desc: "Bookmark courses to revisit them anytime — it takes 30 seconds to create your free account.",
    },
    review: {
      title: "Sign in to leave a review",
      desc: "Reviews come from verified learners. Create your free account to share your experience.",
    },
    cart: {
      title: "Almost there — create your account",
      desc: "We'll attach this course to your new account so you can pay and start learning right away.",
    },
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{copy[reason].title}</DialogTitle>
          <DialogDescription className="text-center">{copy[reason].desc}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full" onClick={() => setOpen(false)}>
            <Link to={`/sign-up${qs}`}>Create free account</Link>
          </Button>
          <Button asChild variant="outline" className="w-full" onClick={() => setOpen(false)}>
            <Link to={`/sign-in${qs}`}>I already have an account</Link>
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

/** Helper to request the signup prompt from anywhere in the app. */
export function requestSignup(reason: Reason = "enroll") {
  try { window.dispatchEvent(new CustomEvent("sec:request-signup", { detail: { reason } })); } catch {}
}