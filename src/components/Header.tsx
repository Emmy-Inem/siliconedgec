import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "For Businesses", href: "/for-businesses" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isHeroPage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || !isHeroPage
          ? "bg-card/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-sm">SE</span>
          </div>
          <span
            className={cn(
              "font-heading font-bold text-lg transition-colors",
              scrolled || !isHeroPage ? "text-foreground" : "text-hero"
            )}
          >
            Silicon Edge
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                scrolled || !isHeroPage ? "text-foreground" : "text-hero-muted hover:text-hero"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" className={cn(
            scrolled || !isHeroPage ? "" : "text-hero-muted hover:text-hero hover:bg-navy-light"
          )}>
            Sign In
          </Button>
          <Button size="sm">Get Started</Button>
        </div>

        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <X className={cn("h-6 w-6", scrolled || !isHeroPage ? "text-foreground" : "text-hero")} />
          ) : (
            <Menu className={cn("h-6 w-6", scrolled || !isHeroPage ? "text-foreground" : "text-hero")} />
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-card border-b border-border p-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-foreground hover:text-primary py-2"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" className="flex-1">Sign In</Button>
            <Button size="sm" className="flex-1">Get Started</Button>
          </div>
        </div>
      )}
    </header>
  );
}
