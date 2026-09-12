const ALUMNI_BRANDS: { name: string; slug: string }[] = [
  { name: "Google",     slug: "google" },
  { name: "Meta",       slug: "meta" },
  { name: "Apple",      slug: "apple" },
  { name: "Cisco",      slug: "cisco" },
  { name: "Intel",      slug: "intel" },
  { name: "Nvidia",     slug: "nvidia" },
  { name: "GitHub",     slug: "github" },
  { name: "Atlassian",  slug: "atlassian" },
  { name: "Stripe",     slug: "stripe" },
  { name: "Shopify",    slug: "shopify" },
  { name: "Netflix",    slug: "netflix" },
  { name: "Spotify",    slug: "spotify" },
  { name: "Airbnb",     slug: "airbnb" },
  { name: "Uber",       slug: "uber" },
  { name: "PayPal",     slug: "paypal" },
  { name: "Tesla",      slug: "tesla" },
  { name: "Cloudflare", slug: "cloudflare" },
  { name: "Vercel",     slug: "vercel" },
  { name: "Docker",     slug: "docker" },
  { name: "MongoDB",    slug: "mongodb" },
];

export function AlumniMarquee() {
  return (
    <div className="relative overflow-hidden" aria-label="Our alumni work at leading global companies">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />

      <div
        className="flex w-max items-center py-5 will-change-transform"
        style={{ animation: "marquee 42s linear infinite" }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-10 sm:gap-14 pr-10 sm:pr-14">
            {ALUMNI_BRANDS.map((brand) => (
              <a
                key={`${brand.name}-${copy}`}
                href="#"
                onClick={(e) => e.preventDefault()}
                title={brand.name}
                aria-label={brand.name}
                className="group relative flex h-8 sm:h-9 w-[110px] sm:w-[130px] shrink-0 items-center justify-center"
              >
                {/* Black/grayscale base */}
                <img
                  src={`https://cdn.simpleicons.org/${brand.slug}/111111`}
                  alt={brand.name}
                  loading="lazy"
                  width={120}
                  height={36}
                  className="max-h-full max-w-full object-contain opacity-60 transition-opacity duration-300 ease-out group-hover:opacity-0"
                />
                {/* Full color overlay revealed on hover */}
                <img
                  src={`https://cdn.simpleicons.org/${brand.slug}`}
                  alt={`${brand.name} logo`}
                  loading="lazy"
                  width={120}
                  height={36}
                  className="absolute inset-0 m-auto max-h-full max-w-full object-contain opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
                />
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
