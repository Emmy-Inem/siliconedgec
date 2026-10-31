import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router-dom";
import { updateGoogleConsent } from "@/lib/analytics";
import { JOURNEY_NOTICE_VERSION, saveJourneyChoice } from "@/lib/journey-tracking";

const STORAGE_KEY = "se_cookie_consent";

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      let journey;
      try { journey = JSON.parse(localStorage.getItem("sec_journey_consent") || "null"); } catch { /* Show unanswered choices. */ }
      if (!stored || journey?.version !== JOURNEY_NOTICE_VERSION) {
        setOpen(true);
      } else {
        // Re-apply stored consent on every page load so Google Consent
        // Mode v2 starts in the right state for ad_storage / personalisation.
        updateGoogleConsent(stored === "all", "stored");
      }
    }, 1200);
    const settings = () => setOpen(true);
    window.addEventListener("sec:analytics-settings", settings);
    return () => { clearTimeout(t); window.removeEventListener("sec:analytics-settings", settings); };
  }, []);

  const accept = async (value: "all" | "analytics" | "essential") => {
    setSaving(true);
    setError("");
    try {
    await saveJourneyChoice(value !== "essential");
    localStorage.setItem(STORAGE_KEY, value === "all" ? "all" : "essential");
    // Google Consent Mode v2: flip ad_storage / ad_user_data /
    // ad_personalization based on the user's choice. analytics_storage
    // stays granted (anonymous, aggregate) either way.
    updateGoogleConsent(value === "all");
    setOpen(false);
    } catch { setError("Could not save your choice. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50"
          role="dialog"
          aria-label="Cookie consent"
        >
          <div className="bg-card border border-border shadow-2xl rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Cookie className="h-6 w-6 text-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-sm mb-1">We use cookies</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your choice. <Link to="/privacy" className="text-primary hover:underline">Privacy policy</Link>
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button disabled={saving} size="sm" onClick={() => accept("all")}>Accept all</Button>
                  <Button disabled={saving} size="sm" variant="outline" onClick={() => accept("analytics")}>Analytics only</Button>
                  <Button disabled={saving} size="sm" variant="outline" onClick={() => accept("essential")}>Essential only</Button>
                </div>
                {error && <p role="alert" className="text-xs text-destructive mt-2">{error}</p>}
              </div>
              <Button variant="ghost" size="icon" disabled={saving}
                onClick={() => accept("essential")}
                aria-label="Dismiss"
                className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
