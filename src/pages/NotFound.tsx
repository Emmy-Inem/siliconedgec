import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Home, Search, Briefcase, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PRODUCTION_ORIGIN = "https://siliconedgec.com";
const LOOKUP_TIMEOUT_MS = 1500;

type GoneRow = { reason: string | null; redirect_to?: string | null };

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [gone, setGone] = useState<GoneRow | null>(null);
  const [checked, setChecked] = useState(false);
  const [slow, setSlow] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  /** Cover-page search fallback — when a user hits a dead URL we let them
   *  type a term and bounce them to /courses?q=… so they don't dead-end. */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    navigate(`/courses?q=${encodeURIComponent(q)}`);
  };

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

          <form
            onSubmit={handleSearch}
            className="mt-2 flex items-stretch gap-2 max-w-md mx-auto"
            role="search"
            aria-label="Search the course catalog"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses (e.g. AWS, Python, DevOps)"
                aria-label="Search courses"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                maxLength={120}
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim() || searching}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Or <Link to="/courses" className="text-primary hover:underline">browse the full catalog</Link>.
          </p>
        </div>
      </div>
    </>
  );
};

export default NotFound;
