import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Home, Search, Briefcase, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PRODUCTION_ORIGIN = "https://siliconedgec.com";
const LOOKUP_TIMEOUT_MS = 1500;

type GoneRow = { reason: string | null; redirect_to?: string | null };

const NotFound = () => {
  const location = useLocation();
  const [gone, setGone] = useState<GoneRow | null>(null);
  const [checked, setChecked] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let active = true;
    setChecked(false);
    setSlow(false);
    setGone(null);

    // Fallback if the lookup is slow — show base 404 UI rather than a blocking spinner
    const slowTimer = window.setTimeout(() => { if (active) setSlow(true); }, LOOKUP_TIMEOUT_MS);

    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("gone_urls")
          .select("reason")
          .eq("path", location.pathname)
          .maybeSingle();
        if (!active) return;
        setGone((data as unknown as GoneRow | null) ?? null);
      } catch {
        // Network/RLS hiccup — treat as plain 404
        if (active) setGone(null);
      } finally {
        if (active) {
          setChecked(true);
          window.clearTimeout(slowTimer);
        }
      }
    })();

    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    return () => {
      active = false;
      window.clearTimeout(slowTimer);
    };
  }, [location.pathname]);

  const isGone = checked && gone !== null;
  const code = isGone ? "410" : "404";
  const title = isGone ? "This page is gone" : "Page not found";
  const message = isGone
    ? gone?.reason || "This page has been permanently removed and won't be coming back."
    : "The page you're looking for doesn't exist or has been moved.";

  // Suggest a sensible canonical for crawlers: the homepage for 410/404 pages.
  const canonical = `${PRODUCTION_ORIGIN}/`;

  return (
    <>
      <Helmet>
        <title>{`${code} — ${title} | Silicon Edge Consulting`}</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="googlebot" content="noindex, nofollow, noarchive" />
        {/* Best-effort SPA signal — real status is set by hosting */}
        <meta httpEquiv="Status" content={isGone ? "410 Gone" : "404 Not Found"} />
        {/* Canonical fallback so crawlers don't index this surface */}
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={`${code} — ${title}`} />
        <meta property="og:description" content={message} />
        <meta name="description" content={message} />
      </Helmet>

      <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
        <div className="text-center max-w-lg w-full">
          <h1 className="mb-2 text-7xl md:text-8xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
            {code}
          </h1>
          <p className="mb-3 text-2xl md:text-3xl font-semibold">{title}</p>
          <p className="mb-2 text-muted-foreground">{message}</p>
          <p className="mb-8 text-xs text-muted-foreground/70 font-mono break-all">
            {location.pathname}
          </p>

          {/* Slow-lookup hint: show a tiny inline indicator while we still wait
              past the threshold. Never blocks the page. */}
          {!checked && slow && (
            <div className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking page status…
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Link to="/" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-background/50 hover:border-primary/50 hover:bg-background transition-colors">
              <Home className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Home</span>
            </Link>
            <Link to="/courses" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-background/50 hover:border-primary/50 hover:bg-background transition-colors">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Browse Courses</span>
            </Link>
            <Link to="/jobs" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-background/50 hover:border-primary/50 hover:bg-background transition-colors">
              <Briefcase className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">View Jobs</span>
            </Link>
          </div>

          <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium">
            <Search className="h-4 w-4" />
            Or search the catalog
          </Link>
        </div>
      </div>
    </>
  );
};

export default NotFound;
