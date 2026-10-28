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
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Reason = "enroll" | "register" | "bookmark" | "review" | "cart" | "coach";

/** Signup appears only after an explicit account action. */
export function SignupPromptModal() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("enroll");
  // Listen for explicit requests (Enroll / Add to cart taps from anon users).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { reason?: Reason } | undefined;
      if (user || (location.pathname === "/for-businesses" && detail?.reason !== "coach")) return;
      if (detail?.reason === ("auto" as Reason)) return;
      setReason(detail?.reason ?? "enroll");
      setOpen(true);
    };
    window.addEventListener("sec:request-signup", handler as EventListener);
    return () => window.removeEventListener("sec:request-signup", handler as EventListener);
  }, [user, location.pathname]);

  useEffect(() => { setOpen(false); }, [user, location.pathname]);

  const handleClose = (next: boolean) => setOpen(next);

  if (user) return null;

  const dest = location.pathname + location.search;
  const qs = `?redirect=${encodeURIComponent(dest)}`;

  const copy: Record<Reason, { title: string; desc: string }> = {
    coach: {
      title: "Keep chatting with your AI Coach",
      desc: "You've used your two free questions. Create a free account or sign in to ask your next question.",
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
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
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
