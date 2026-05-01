import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router-dom";
import { updateGoogleConsent } from "@/lib/analytics";

const STORAGE_KEY = "se_cookie_consent";

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setOpen(true);
      } else {
        // Re-apply stored consent on every page load so Google Consent
        // Mode v2 starts in the right state for ad_storage / personalisation.
        updateGoogleConsent(stored === "all", "stored");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const accept = (value: "all" | "essential") => {
    localStorage.setItem(STORAGE_KEY, value);
    // Google Consent Mode v2: flip ad_storage / ad_user_data /
    // ad_personalization based on the user's choice. analytics_storage
    // stays granted (anonymous, aggregate) either way.
    updateGoogleConsent(value === "all");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50"
          role="dialog"
          aria-label="Cookie consent"
        >
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">We use cookies</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We use essential cookies to keep you signed in and analytics cookies to improve the site.{" "}
                  <Link to="/p/privacy" className="text-primary hover:underline">Read our privacy policy</Link>.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => accept("all")}>Accept all</Button>
                  <Button size="sm" variant="outline" onClick={() => accept("essential")}>Essential only</Button>
                </div>
              </div>
              <button
                onClick={() => accept("essential")}
                aria-label="Dismiss"
                className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
