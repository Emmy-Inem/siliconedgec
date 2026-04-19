import { Helmet } from "react-helmet-async";

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

export function SEO({ title, description = DEFAULT_DESCRIPTION, image = DEFAULT_IMAGE, type = "website", canonical, jsonLd }: SEOProps) {
  const fullTitle = title.includes("Silicon Edge") ? title : `${title} | Silicon Edge Consulting`;
  const url = canonical ?? (typeof window !== "undefined" ? window.location.href : undefined);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {url && <link rel="canonical" href={url} />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      {url && <meta property="og:url" content={url} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
