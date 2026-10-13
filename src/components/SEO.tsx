import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  canonical?: string;
  jsonLd?: Record<string, unknown>;
  noIndex?: boolean;
  locale?: string;
}

const DEFAULT_DESCRIPTION = "Master AI, Cloud, DevOps and more with live, instructor-led training programs. Job-ready skills from industry veterans.";
const PRODUCTION_ORIGIN = "https://siliconedgec.com";

/** Force canonicals to use the production domain even when viewed on
 *  preview/lovable subdomains, and strip tracking params. */
function buildCanonical(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  // Strip UTM + common tracking params from canonicals
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "gclid", "fbclid"].forEach((k) =>
    params.delete(k)
  );
  const qs = params.toString();
  return `${PRODUCTION_ORIGIN}${pathname}${qs ? `?${qs}` : ""}`;
}

export function SEO({ title, description = DEFAULT_DESCRIPTION, image, type = "website", canonical, jsonLd, noIndex, locale = "en_NG" }: SEOProps) {
  const location = useLocation();
  const [override, setOverride] = useState<{
    title?: string | null;
    description?: string | null;
    keywords?: string | null;
    canonical_url?: string | null;
    og_image_url?: string | null;
    no_index?: boolean | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setOverride(null);
    (async () => {
      const { data } = await supabase
        .from("page_seo")
        .select("title, description, keywords, canonical_url, og_image_url, no_index")
        .eq("path", location.pathname)
        .maybeSingle();
      if (active) setOverride(data ?? null);
    })();
    return () => { active = false; };
  }, [location.pathname]);

  const finalTitle = override?.title || title;
  const finalDescription = override?.description || description;
  const finalImage = override?.og_image_url || image;
  const fullTitle = finalTitle.includes("Silicon Edge") ? finalTitle : `${finalTitle} | Silicon Edge Consulting`;
  const rawCanonical = override?.canonical_url || canonical;
  const url = rawCanonical
    ? (rawCanonical.startsWith("http") ? rawCanonical : `${PRODUCTION_ORIGIN}${rawCanonical.startsWith("/") ? "" : "/"}${rawCanonical}`)
    : buildCanonical(location.pathname, location.search);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      {override?.keywords && <meta name="keywords" content={override.keywords} />}
      {(override?.no_index || noIndex) && <meta name="robots" content="noindex, nofollow" />}
      {url && <link rel="canonical" href={url} />}
      {url && <link rel="alternate" hrefLang="en" href={url} />}
      {url && <link rel="alternate" hrefLang="x-default" href={url} />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Silicon Edge Consulting" />
      <meta property="og:locale" content={locale} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      {finalImage && <meta property="og:image" content={finalImage} />}
      {url && <meta property="og:url" content={url} />}

      <meta name="twitter:card" content={finalImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
      {finalImage && <meta name="twitter:image" content={finalImage} />}

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
