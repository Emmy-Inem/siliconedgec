import { forwardRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, ArrowRight, Facebook, Instagram, Linkedin, Youtube, Music2, Loader2, ArrowUp } from "lucide-react";
import logoLight from "@/assets/logo-light.png";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// X (Twitter) inline SVG — Lucide doesn't ship the new X mark.
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.244 2H21l-6.52 7.45L22 22h-6.84l-4.78-6.24L4.8 22H2.04l6.97-7.96L2 2h6.96l4.32 5.71L18.244 2Zm-2.4 18h1.86L7.27 4H5.3l10.544 16Z" />
  </svg>
);

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  social_facebook: Facebook,
  social_instagram: Instagram,
  social_linkedin: Linkedin,
  social_twitter: XIcon,
  social_tiktok: Music2,
  social_youtube: Youtube,
};

// Filter out slugs that already have dedicated navigation links to prevent duplicates
const DUP_SLUGS = new Set([
  "about",
  "about-us",
  "terms",
  "terms-of-service",
  "privacy",
  "privacy-policy",
  "refund",
  "refund-policy",
  "cookies",
  "cookie-policy",
  "faq",
  "help",
  "contact",
]);

export const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  const [email, setEmail] = useState("");
  const [subBusy, setSubBusy] = useState(false);
  const { data: settings } = useSiteSettings();

  const { data: cmsLinks = [] } = useQuery({
    queryKey: ["footer-cms-pages"],
    queryFn: async () => {
      const { data } = await (supabase
        .from("cms_pages" as any)
        .select("title, slug")
        .eq("status", "published")
        .eq("show_in_footer", true)
        .order("order_index"));
      return (data as unknown as { title: string; slug: string }[]) ?? [];
    },
  });

  const uniqueCmsLinks = cmsLinks.filter(
    (p) => !DUP_SLUGS.has(p.slug?.toLowerCase().trim())
  );

  const socials = Object.entries(SOCIAL_ICONS)
    .filter(([key]) => settings?.[key as keyof typeof settings])
    .map(([key, Icon]) => ({
      url: settings?.[key as keyof typeof settings] as string,
      Icon,
      label: key.replace(/_url$|social_/g, "").replace(/_/g, " "),
    }));

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
        body: { email: email.trim(), source: "footer" },
      });
      if (error) throw error;
      toast({
        title: data?.already ? "You're already subscribed" : "Almost there!",
        description: data?.already
          ? "This email is already on our list."
          : "Check your inbox to confirm your subscription.",
      });
      setEmail("");
    } catch (err: any) {
      toast({ title: "Couldn't subscribe", description: err.message, variant: "destructive" });
    } finally {
      setSubBusy(false);
    }
  };

  return (
    <footer ref={ref} className="relative bg-navy text-hero-muted overflow-hidden border-t border-white/10">
      {/* Top subtle accent gradient beam */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-5xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-primary/5 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-5 sm:px-6 py-16 relative">
        {/* Main 12-column balanced grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-8 lg:gap-8">
          {/* Col 1: Brand (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <Link to="/" className="inline-block transition-opacity hover:opacity-90">
              <img
                src={logoLight}
                alt={settings?.site_name || "Silicon Edge Consulting"}
                className="h-8 w-auto"
                loading="lazy"
              />
            </Link>
            <p className="text-sm leading-relaxed text-hero-muted/90">
              {settings?.site_tagline || "Empowering professionals with job-ready tech skills through live, instructor-led training programs."}
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-light/80 border border-white/10 text-xs text-hero-muted">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-medium text-white/90">Global Cohorts Enrolling</span>
            </div>

            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {socials.map(({ url, Icon, label }) => (
                  <a
                    key={url}
                    href={url}
                    aria-label={`Silicon Edge Consulting on ${label}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-navy-light/90 border border-white/10 text-hero-muted hover:text-primary hover:border-primary/40 hover:bg-primary/10 transition-all duration-200 flex items-center justify-center hover:-translate-y-0.5 shadow-sm"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Col 2: Programs (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-heading font-semibold text-xs text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Programs
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/courses" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Courses</Link></li>
              <li><Link to="/paths" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Learning Paths</Link></li>
              <li><Link to="/bootcamp" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Bootcamps</Link></li>
              <li><Link to="/pricing" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Pricing</Link></li>
              <li><Link to="/certificates" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Certificates</Link></li>
              <li><Link to="/for-businesses" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">For Businesses</Link></li>
            </ul>
          </div>

          {/* Col 3: Company (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-heading font-semibold text-xs text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Company
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/about" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">About</Link></li>
              <li><Link to="/instructors" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Instructors</Link></li>
              <li><Link to="/testimonials" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Testimonials</Link></li>
              <li><Link to="/blog" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Blog</Link></li>
              <li><Link to="/jobs" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Jobs</Link></li>
              <li><Link to="/contact" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Contact</Link></li>
            </ul>
          </div>

          {/* Col 4: Legal & Support (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-heading font-semibold text-xs text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Legal &amp; Support
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/help" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Help &amp; FAQ</Link></li>
              <li><Link to="/terms" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Terms</Link></li>
              <li><Link to="/privacy" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Privacy</Link></li>
              <li><Link to="/refund-policy" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Refund Policy</Link></li>
              <li><Link to="/cookie-policy" className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">Cookies</Link></li>
              {uniqueCmsLinks.map((p) => (
                <li key={p.slug}>
                  <Link to={`/p/${p.slug}`} className="text-hero-muted/85 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">{p.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 5: Newsletter & Contact (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="font-heading font-semibold text-xs text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Stay Connected
            </h4>
            <p className="text-xs text-hero-muted/90 leading-relaxed">
              Stay up to date with our latest news, receive exclusive deals, and more.
            </p>
            <form onSubmit={handleSubscribe} className="relative flex items-center">
              <input
                type="email"
                placeholder="Enter Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-navy-light/90 border border-white/10 text-sm text-white placeholder:text-hero-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <button
                type="submit"
                aria-label="Subscribe to the Silicon Edge newsletter"
                disabled={subBusy}
                className="absolute right-1.5 p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center shadow-md shadow-primary/20 cursor-pointer"
              >
                {subBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <ul className="space-y-2.5 pt-2 text-xs">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <span className="leading-snug text-hero-muted/85">
                  {settings?.contact_address && settings.contact_address !== "UPDATE IN ADMIN SETTINGS"
                    ? settings.contact_address
                    : "3rd floor, 86-90, Paul Street, London, EC2A 4NE"}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                <a
                  href={`mailto:${settings?.contact_email || "info@siliconedgec.com"}`}
                  className="text-hero-muted/85 hover:text-white transition-colors"
                >
                  {settings?.contact_email || "info@siliconedgec.com"}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                <a
                  href={`tel:${settings?.contact_phone && settings.contact_phone !== "UPDATE IN ADMIN SETTINGS" ? settings.contact_phone : "+447741247592"}`}
                  className="text-hero-muted/85 hover:text-white transition-colors"
                >
                  {settings?.contact_phone && settings.contact_phone !== "UPDATE IN ADMIN SETTINGS" ? settings.contact_phone : "+447741247592"}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & legal bar */}
        <div className="border-t border-white/10 mt-14 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-hero-muted/70">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1">
            <p>{settings?.footer_copyright || `© All Rights Reserved ${new Date().getFullYear()}. Silicon Edge Consulting.`}</p>
            <span className="hidden sm:inline text-white/20">·</span>
            <span className="text-hero-muted/60">London, United Kingdom</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookies</Link>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors text-hero-muted cursor-pointer ml-2"
              aria-label="Back to top"
            >
              <span>Top</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
});

