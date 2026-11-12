import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const SIGNUP_PROMPT_KEY = "sec_signup_prompt_shown";
export const SIGNUP_PROMPT_DELAY_MS = 60_000;
const HIDDEN_PATHS = /^\/(admin|sign-in|sign-up|forgot-password|reset-password|checkout|auth)(\/|$)/;

/** True when a signed-out visitor should get the one-time sign-up prompt. */
export function shouldShowSignupPrompt(signedIn: boolean, path: string, alreadyShown: boolean) {
  return !signedIn && !alreadyShown && !HIDDEN_PATHS.test(path);
}

function alreadyShown() {
  try { return localStorage.getItem(SIGNUP_PROMPT_KEY) === "1"; } catch { return true; }
}

/** Shows once, after a visitor has spent one minute browsing the site. */
export function SignupPrompt() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const eligible = !loading && shouldShowSignupPrompt(!!user, pathname, alreadyShown());

  useEffect(() => {
    if (!eligible) return;
    const timer = setTimeout(() => {
      if (!shouldShowSignupPrompt(false, window.location.pathname, alreadyShown())) return;
      try { localStorage.setItem(SIGNUP_PROMPT_KEY, "1"); } catch { /* ignore */ }
      setOpen(true);
    }, SIGNUP_PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible]);

  useEffect(() => { if (user) setOpen(false); }, [user]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Start your tech career journey</DialogTitle>
          <DialogDescription>Create a free account to save courses, track your progress and get updates on new intakes.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button asChild className="flex-1"><Link to="/sign-up" onClick={() => setOpen(false)}>Sign up free</Link></Button>
          <Button asChild variant="outline" className="flex-1"><Link to="/sign-in" onClick={() => setOpen(false)}>Sign in</Link></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
