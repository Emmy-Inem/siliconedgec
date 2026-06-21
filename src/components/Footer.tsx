import { forwardRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, ArrowRight, Facebook, Instagram, Linkedin, Youtube, Music2 } from "lucide-react";
import logoLight from "@/assets/logo-light.png";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  const [email, setEmail] = useState("");
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

  const socials = Object.entries(SOCIAL_ICONS)
    .filter(([key]) => settings?.[key as keyof typeof settings])
    .map(([key, Icon]) => ({ url: settings?.[key as keyof typeof settings] as string, Icon }));

  return (
    <footer ref={ref} className="bg-navy text-hero-muted">
      <div className="container mx-auto px-5 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <img src={logoLight} alt={settings?.site_name || "Silicon Edge Consulting"} className="h-8 w-auto" />
            </Link>
            <p className="text-sm leading-relaxed">
              {settings?.site_tagline || "Empowering professionals with job-ready tech skills through live, instructor-led training programs."}
            </p>
            {socials.length > 0 && (
              <div className="flex gap-3 pt-2">
                {socials.map(({ url, Icon }) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-navy-light flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-heading font-semibold text-hero mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/courses" className="hover:text-primary transition-colors">Courses</Link></li>
              <li><Link to="/instructors" className="hover:text-primary transition-colors">Instructors</Link></li>
              <li><Link to="/testimonials" className="hover:text-primary transition-colors">Testimonials</Link></li>
              <li><Link to="/certificates" className="hover:text-primary transition-colors">Certificates</Link></li>
              <li><Link to="/for-businesses" className="hover:text-primary transition-colors">For Businesses</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link to="/trust" className="hover:text-primary transition-colors">Trust &amp; Privacy</Link></li>
              <li>
                <a
                  href="https://wa.me/447741247592"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Support
                </a>
              </li>
              {cmsLinks.map((p) => (
                <li key={p.slug}>
                  <Link to={`/p/${p.slug}`} className="hover:text-primary transition-colors">{p.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-hero mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{settings?.contact_address && settings.contact_address !== "UPDATE IN ADMIN SETTINGS" ? settings.contact_address : "3rd floor, 86-90, Paul Street, London, EC2A 4NE"}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <a href={`mailto:${settings?.contact_email || "info@siliconedgec.com"}`} className="hover:text-primary transition-colors">{settings?.contact_email || "info@siliconedgec.com"}</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href={`tel:${(settings?.contact_phone && settings.contact_phone !== "UPDATE IN ADMIN SETTINGS") ? settings.contact_phone : "+447741247592"}`} className="hover:text-primary transition-colors">{(settings?.contact_phone && settings.contact_phone !== "UPDATE IN ADMIN SETTINGS") ? settings.contact_phone : "+447741247592"}</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-hero mb-4">Newsletter</h4>
            <p className="text-sm mb-3">Stay up to date with our latest news, receive exclusive deals, and more.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-navy-light border border-navy-light text-sm text-hero placeholder:text-hero-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity hover-scale">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-navy-light mt-12 pt-8 text-center text-xs">
          <p>{settings?.footer_copyright || `© All Rights Reserved ${new Date().getFullYear()}. Silicon Edge Consulting. Website by Instasite Studio`}</p>
        </div>
      </div>
    </footer>
  );
});
