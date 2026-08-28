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
}

const DEFAULT_DESCRIPTION = "Master AI, Cloud, DevOps and more with live, instructor-led training programs. Job-ready skills from industry veterans.";
const DEFAULT_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ddc2d0fe-cdba-4f84-9bff-05dfcb6f4f25/id-preview-ad6dd644--39a05b61-2976-479d-954e-83ee91469ade.lovable.app-1772869755615.png";
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

export function SEO({ title, description = DEFAULT_DESCRIPTION, image = DEFAULT_IMAGE, type = "website", canonical, jsonLd }: SEOProps) {
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
  const url =
    override?.canonical_url ||
    canonical ||
    buildCanonical(location.pathname, location.search);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      {override?.keywords && <meta name="keywords" content={override.keywords} />}
      {override?.no_index && <meta name="robots" content="noindex, nofollow" />}
      {url && <link rel="canonical" href={url} />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Silicon Edge Consulting" />
      <meta property="og:locale" content="en_NG" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      {url && <meta property="og:url" content={url} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
