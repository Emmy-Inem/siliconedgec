import { Link, useParams, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from "lucide-react";
import { BUSINESS, LOCATIONS, getLocation, type CityLocation } from "@/data/locations";

const COURSES = [
  { name: "Azure Cloud Engineering Accelerator", href: "/courses/azure-cloud-engineering-accelerator" },
  { name: "AWS Solutions Architect Associate", href: "/courses/aws-solutions-architect-associate" },
  { name: "Microsoft Azure Administrator (AZ-104)", href: "/courses/microsoft-azure-administrator-az104" },
  { name: "DevOps: Docker, Kubernetes and IaC", href: "/courses/devops-docker-kubernetes-iac" },
  { name: "Google Associate Cloud Engineer", href: "/courses/google-associate-cloud-engineer" },
];

const address = {
  "@type": "PostalAddress",
  streetAddress: BUSINESS.street,
  addressLocality: BUSINESS.locality,
  postalCode: BUSINESS.postalCode,
  addressCountry: BUSINESS.country,
};

function BusinessCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm">
      <h2 className="font-display text-lg font-semibold text-foreground">{BUSINESS.name}</h2>
      <p className="flex gap-2 text-muted-foreground"><MapPin className="h-4 w-4 mt-0.5 shrink-0" />{BUSINESS.street}, {BUSINESS.locality} {BUSINESS.postalCode}, United Kingdom</p>
      <p className="flex gap-2 text-muted-foreground"><Phone className="h-4 w-4 mt-0.5" /><a href={`tel:${BUSINESS.phone}`}>+44 7741 247592</a></p>
      <p className="flex gap-2 text-muted-foreground"><Mail className="h-4 w-4 mt-0.5" /><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></p>
    </div>
  );
}

function CityPage({ loc }: { loc: CityLocation }) {
  const url = `${BUSINESS.url}/locations/${loc.slug}`;
  const title = `Cloud Computing Training in ${loc.city}`;
  const description = `Live, instructor-led cloud, Azure, AWS and DevOps training for learners and teams in ${loc.city}, ${loc.country}. Hands-on projects, mentorship and sessions in ${loc.timezone}.`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        name: BUSINESS.name,
        url: BUSINESS.url,
        telephone: BUSINESS.phone,
        email: BUSINESS.email,
        address,
        areaServed: { "@type": "City", name: loc.city, containedInPlace: { "@type": "Country", name: loc.country } },
      },
      {
        "@type": "Service",
        name: title,
        serviceType: "Cloud computing training",
        provider: { "@type": "EducationalOrganization", name: BUSINESS.name, url: BUSINESS.url },
        areaServed: { "@type": "City", name: loc.city },
        availableChannel: { "@type": "ServiceChannel", serviceUrl: url },
        url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BUSINESS.url },
          { "@type": "ListItem", position: 2, name: "Locations", item: `${BUSINESS.url}/locations` },
          { "@type": "ListItem", position: 3, name: loc.city, item: url },
        ],
      },
    ],
  };
  const nearby = LOCATIONS.filter((l) => l.region === loc.region && l.slug !== loc.slug);

  return (
    <>
      <SEO title={title} description={description} canonical={url} jsonLd={jsonLd} locale={loc.region === "uk" ? "en_GB" : "en_IE"} />
      <section className="pt-28 pb-12 md:pt-36 border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <nav className="text-sm text-muted-foreground mb-4"><Link to="/locations">Locations</Link> / {loc.city}</nav>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground">Cloud computing training in {loc.city}</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl">{loc.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild><Link to="/courses">Browse courses</Link></Button>
            <Button asChild variant="outline"><Link to="/contact">Talk to an adviser</Link></Button>
          </div>
        </div>
      </section>
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2 space-y-8">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">How training works for {loc.city} learners</h2>
              <ul className="mt-4 space-y-2 text-muted-foreground">
                {[
                  loc.hasOffice ? "Live classes led by our London team, delivered online so you can join from anywhere in the city" : `Live online classes — no office visit needed in ${loc.city}`,
                  `Sessions scheduled for ${loc.timezone}, with recordings of every class`,
                  "Hands-on labs and portfolio projects reviewed by mentors",
                  "Verified certificate on completion, plus guidance for vendor exams",
                ].map((t) => <li key={t} className="flex gap-2"><CheckCircle2 className="h-4 w-4 mt-1 shrink-0" />{t}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Popular courses</h2>
              <ul className="mt-4 grid sm:grid-cols-2 gap-3">
                {COURSES.map((c) => <li key={c.href}><Link to={c.href} className="block rounded-lg border border-border p-4 hover:bg-muted text-foreground">{c.name}</Link></li>)}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Cloud skills in demand across {loc.city}</h2>
              <p className="mt-3 text-muted-foreground">Employers in sectors such as {loc.sectors.join(", ").toLowerCase()} rely on cloud, DevOps and data skills. Our courses focus on the practical tasks these teams hire for.</p>
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">Training for {loc.city} teams</h2>
              <p className="mt-3 text-muted-foreground">We run private cohorts for companies. <Link to="/for-businesses" className="text-primary underline">See team training</Link>.</p>
            </div>
          </div>
          <aside className="space-y-6">
            <BusinessCard />
            <div className="rounded-xl border border-border p-6 text-sm">
              <p className="flex gap-2 text-muted-foreground"><Clock className="h-4 w-4 mt-0.5" />Time zone: {loc.timezone}</p>
            </div>
            {nearby.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Also serving</h3>
                <ul className="flex flex-wrap gap-2 text-sm">
                  {nearby.map((n) => <li key={n.slug}><Link to={`/locations/${n.slug}`} className="text-primary">{n.city}</Link></li>)}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}

function Index() {
  const groups = [
    { label: "United Kingdom", items: LOCATIONS.filter((l) => l.region === "uk") },
    { label: "Europe", items: LOCATIONS.filter((l) => l.region === "europe") },
  ];
  return (
    <>
      <SEO
        title="Cloud Training Locations in the UK and Europe"
        description="Live, instructor-led cloud computing training for learners in London, Manchester, Birmingham, Edinburgh, Dublin, Amsterdam, Berlin and more."
        canonical={`${BUSINESS.url}/locations`}
        locale="en_GB"
        jsonLd={{ "@context": "https://schema.org", "@type": "EducationalOrganization", name: BUSINESS.name, url: BUSINESS.url, telephone: BUSINESS.phone, address,
          areaServed: LOCATIONS.map((l) => ({ "@type": "City", name: l.city })) }}
      />
      <section className="pt-28 pb-12 md:pt-36">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground">Cloud training across the UK and Europe</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl">We're based in London and teach live online cohorts for learners throughout the UK and Europe.</p>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            <div className="md:col-span-2 space-y-8">
              {groups.map((g) => (
                <div key={g.label}>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">{g.label}</h2>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {g.items.map((l) => (
                      <li key={l.slug}><Link to={`/locations/${l.slug}`} className="block rounded-lg border border-border p-4 hover:bg-muted text-foreground">Cloud training in {l.city}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <aside><BusinessCard /></aside>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Locations() {
  const { city } = useParams();
  const loc = city ? getLocation(city) : undefined;
  if (city && !loc) return <Navigate to="/locations" replace />;
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">{loc ? <CityPage loc={loc} /> : <Index />}</main>
      <Footer />
    </div>
  );
}
