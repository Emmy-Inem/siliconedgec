import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

const NotFound = () => {
  const location = useLocation();
  const [gone, setGone] = useState<{ reason: string | null } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await (supabase.from("gone_urls" as any).select("reason").eq("path", location.pathname).maybeSingle());
      if (!active) return;
      setGone((data as any) ?? null);
      setChecked(true);
    })();
    if (!gone) console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    return () => { active = false; };
  }, [location.pathname]);

  const isGone = checked && gone !== null;
  const code = isGone ? "410" : "404";
  const title = isGone ? "This page is gone" : "Page not found";
  const message = isGone
    ? gone?.reason || "This page has been permanently removed."
    : "Oops! The page you're looking for doesn't exist.";

  return (
    <>
      <Helmet>
        <title>{`${code} — ${title} | Silicon Edge Consulting`}</title>
        <meta name="robots" content="noindex, nofollow" />
        {/* Hint to crawlers — SPA can't set HTTP status, but noindex + Gone-Status header analog */}
        {isGone && <meta httpEquiv="Status" content="410 Gone" />}
      </Helmet>
      <div className="flex min-h-screen items-center justify-center bg-muted px-4">
        <div className="text-center max-w-md">
          <h1 className="mb-4 text-5xl font-bold text-primary">{code}</h1>
          <p className="mb-2 text-2xl font-semibold">{title}</p>
          <p className="mb-6 text-muted-foreground">{message}</p>
          <Link to="/" className="text-primary underline hover:text-primary/90 font-medium">
            Return to Home
          </Link>
        </div>
      </div>
    </>
  );
};

export default NotFound;
