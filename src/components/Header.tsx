import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, User, LayoutDashboard, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useHasPublishedJobs } from "@/hooks/useHasPublishedJobs";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

const baseNavLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Pricing", href: "/pricing" },
  { label: "Certificates", href: "/certificates" },
  { label: "For Businesses", href: "/for-businesses" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const darkHeroPages = ["/", "/for-businesses", "/certificates", "/pricing"];
  const isHeroPage = darkHeroPages.includes(location.pathname);
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const { data: hasJobs } = useHasPublishedJobs();
  const navLinks = hasJobs
    ? [baseNavLinks[0], baseNavLinks[1], { label: "Jobs", href: "/jobs" }, ...baseNavLinks.slice(2)]
    : baseNavLinks;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const showLight = !scrolled && isHeroPage;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || !isHeroPage
          ? "bg-card/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto flex items-center justify-between gap-4 h-14 px-4">
        <Link to="/" className="flex items-center shrink-0 mr-2">
          <img
            src={showLight ? logoLight : logoDark}
            alt="Silicon Edge Consulting"
            className="h-9 w-auto max-w-none object-contain"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-5 xl:gap-7 flex-1 justify-center min-w-0">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "text-[13px] font-medium transition-colors hover:text-primary whitespace-nowrap",
                scrolled || !isHeroPage ? "text-foreground" : "text-hero-muted hover:text-hero"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          {/* Cart Icon */}
          <Link
            to="/cart"
            className={cn(
              "relative p-2 rounded-md transition-colors",
              scrolled || !isHeroPage
                ? "text-foreground hover:text-primary hover:bg-muted"
                : "text-hero-muted hover:text-hero hover:bg-navy-light"
            )}
          >
            <ShoppingCart className="h-[18px] w-[18px]" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4.5 w-4.5 min-w-[18px] flex items-center justify-center px-1">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild className={cn(
                  "h-8 px-2.5 text-[13px]",
                  scrolled || !isHeroPage ? "" : "text-hero-muted hover:text-hero hover:bg-navy-light"
                )}>
                  <Link to="/admin"><LayoutDashboard className="h-3.5 w-3.5 mr-1" /> Admin</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild className={cn(
                "h-8 px-2.5 text-[13px]",
                scrolled || !isHeroPage ? "" : "text-hero-muted hover:text-hero hover:bg-navy-light"
              )}>
                <Link to="/dashboard"><User className="h-3.5 w-3.5 mr-1" /> Dashboard</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className={cn(
                "h-8 px-2.5 text-[13px]",
                scrolled || !isHeroPage ? "" : "text-hero-muted hover:text-hero hover:bg-navy-light"
              )}>
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className={cn(
                "h-8 px-3 text-[13px]",
                scrolled || !isHeroPage ? "" : "text-hero-muted hover:text-hero hover:bg-navy-light"
              )}>
                <Link to="/sign-in">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="hover-scale h-8 px-3 text-[13px]">
                <Link to="/sign-up">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile/Tablet: cart + menu toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <Link to="/cart" className={cn(
            "relative p-2",
            scrolled || !isHeroPage ? "text-foreground" : "text-hero"
          )}>
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {count}
              </span>
            )}
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? (
              <X className={cn("h-6 w-6", scrolled || !isHeroPage ? "text-foreground" : "text-hero")} />
            ) : (
              <Menu className={cn("h-6 w-6", scrolled || !isHeroPage ? "text-foreground" : "text-hero")} />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-card border-b border-border p-4 space-y-3 animate-fade-in">
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
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="flex-1" asChild>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                </Button>
                <Button size="sm" className="flex-1" onClick={() => { signOut(); setMenuOpen(false); }}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="flex-1" asChild>
                  <Link to="/sign-in" onClick={() => setMenuOpen(false)}>Sign In</Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link to="/sign-up" onClick={() => setMenuOpen(false)}>Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
