import { useUtmTracking } from "@/hooks/useUtmTracking";

/** Captures UTM params from URL on every route change and stores them in localStorage. */
export function UtmTracker() {
  useUtmTracking();
  return null;
}
