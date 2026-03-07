import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-navy text-hero-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-heading font-bold text-sm">SE</span>
              </div>
              <span className="font-heading font-bold text-lg text-hero">Silicon Edge</span>
            </div>
            <p className="text-sm leading-relaxed">
              Empowering professionals with job-ready tech skills through live, instructor-led training programs.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-hero mb-4">Programs</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/courses" className="hover:text-primary transition-colors">All Courses</Link></li>
              <li><Link to="/for-businesses" className="hover:text-primary transition-colors">Corporate Training</Link></li>
              <li><span className="cursor-default">Certifications</span></li>
              <li><span className="cursor-default">Mentorship</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-hero mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="cursor-default">About Us</span></li>
              <li><span className="cursor-default">Careers</span></li>
              <li><span className="cursor-default">Blog</span></li>
              <li><span className="cursor-default">Partners</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-hero mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                hello@siliconedge.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                +234 800 123 4567
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Lagos, Nigeria
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-light mt-12 pt-8 text-center text-xs">
          <p>© {new Date().getFullYear()} Silicon Edge Consulting. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
