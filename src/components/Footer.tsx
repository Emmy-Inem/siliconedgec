import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { useState } from "react";

export function Footer() {
  const [email, setEmail] = useState("");

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
            <h4 className="font-heading font-semibold text-hero mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/courses" className="hover:text-primary transition-colors">Courses</Link></li>
              <li><Link to="/certificates" className="hover:text-primary transition-colors">Certificates</Link></li>
              <li><Link to="/for-businesses" className="hover:text-primary transition-colors">Support</Link></li>
              <li><span className="cursor-default">FAQ</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-hero mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                3rd floor, 86-90, Paul Street, London, EC2A 4NE
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                info@siliconedgec.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                +447741247592
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
          <p>© All Rights Reserved {new Date().getFullYear()}. Silicon Edge Consulting.</p>
        </div>
      </div>
    </footer>
  );
}
