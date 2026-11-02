import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { trackJourney } from "@/lib/journey-tracking";

export function JourneyTracker() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => { void trackJourney("page_view", undefined, pathname); }, 150);
    return () => clearTimeout(timer);
  }, [pathname, user?.id, loading]);
  return null;
}