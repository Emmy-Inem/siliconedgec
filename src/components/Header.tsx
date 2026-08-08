import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, User, LayoutDashboard, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useHasPublishedJobs } from "@/hooks/useHasPublishedJobs";
import { UserNotificationBell } from "@/components/UserNotificationBell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

const baseNavLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Pricing", href: "/pricing" },
  { label: "Certificates", href: "/certificates" },
  { label: "For Businesses", href: "/for-businesses" },
  { label: "Career", href: "/career" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const location = useLocation();
  const darkHeroPages = ["/", "/for-businesses", "/certificates", "/pricing"];
  const isHeroPage = darkHeroPages.includes(location.pathname);
  const { user, isAdmin, adminRole, signOut } = useAuth();
  const { data: isPartner = false } = useQuery({
    queryKey: ["header-partner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("affiliates").select("id").eq("user_id", user?.id ?? "").eq("status", "approved").maybeSingle();
      return !!data;
    },
  });
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

  // Close the mobile menu on any route change (path or query string) so
  // tapping a link or sub-tab always dismisses it.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (mobileMenuRef.current?.contains(target)) return;
      if (mobileMenuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const showLight = false; // Header now always uses white background; logoDark always

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-white/70 backdrop-blur-md border-b border-white/60 shadow-[0_1px_8px_-4px_rgba(0,0,0,0.08)]"
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
                "relative text-sm font-semibold transition-colors hover:text-primary whitespace-nowrap text-foreground/85",
                location.pathname === link.href && "text-primary after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:bg-primary after:rounded-full"
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
            aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
            className={cn(
              "relative p-2 rounded-md transition-colors text-foreground hover:text-primary hover:bg-muted"
            )}
          >
            <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4.5 w-4.5 min-w-[18px] flex items-center justify-center px-1">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <UserNotificationBell />
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild className="h-8 px-2.5 text-sm font-semibold">
                  <Link to="/admin"><LayoutDashboard className="h-3.5 w-3.5 mr-1" /> Admin</Link>
                </Button>
              )}
              {/* One dashboard per role. Admins get every dashboard through the
                  combined admin view; instructors, partners and students each
                  only see their own. */}
              {adminRole === "admin" ? (
                <Button variant="ghost" size="sm" asChild className="h-8 px-2.5 text-sm font-semibold">
                  <Link to="/admin/dashboards">Dashboards</Link>
                </Button>
              ) : adminRole === "instructor" ? (
                <Button variant="ghost" size="sm" asChild className="h-8 px-2.5 text-sm font-semibold">
                  <Link to="/instructor">Instructor</Link>
                </Button>
              ) : isPartner ? (
                <Button variant="ghost" size="sm" asChild className="h-8 px-2.5 text-sm font-semibold">
                  <Link to="/career/dashboard">Partner</Link>
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" asChild className="h-8 px-2.5 text-sm font-semibold" title="My favorites">
                <Link to="/bookmarks" aria-label="Favorites"><Heart className="h-4 w-4" /></Link>
              </Button>
              {adminRole !== "instructor" && !isPartner && (
                <Button variant="ghost" size="sm" asChild className="h-8 px-2.5 text-sm font-semibold">
                  <Link to="/dashboard"><User className="h-3.5 w-3.5 mr-1" /> Dashboard</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="h-8 px-2.5 text-sm font-semibold">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="h-8 px-3 text-sm font-semibold">
                <Link to="/sign-in">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="hover-scale h-8 px-3 text-sm font-semibold">
                <Link to="/sign-up">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile/Tablet: cart + menu toggle */}
        <div className="lg:hidden flex items-center gap-2">
          {user && <UserNotificationBell />}
          <Link
            to="/cart"
            aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
            className="relative p-2 text-foreground"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {count}
              </span>
            )}
          </Link>
          <button ref={mobileMenuButtonRef} type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          {/* Tap-outside overlay so users can dismiss the menu by tapping anywhere else. */}
          <div
            className="lg:hidden fixed inset-x-0 bottom-0 top-14 z-40 bg-foreground/20"
            onPointerDown={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={mobileMenuRef}
            className="lg:hidden relative z-50 bg-card border-b border-border p-4 space-y-3 animate-fade-in shadow-lg"
            onPointerDown={(event) => event.stopPropagation()}
          >
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
                {adminRole === "admin" ? (
                  <Button variant="ghost" size="sm" className="flex-1" asChild>
                    <Link to="/admin/dashboards" onClick={() => setMenuOpen(false)}>Dashboards</Link>
                  </Button>
                ) : adminRole === "instructor" ? (
                  <Button variant="ghost" size="sm" className="flex-1" asChild>
                    <Link to="/instructor" onClick={() => setMenuOpen(false)}>Instructor</Link>
                  </Button>
                ) : isPartner ? (
                  <Button variant="ghost" size="sm" className="flex-1" asChild>
                    <Link to="/career/dashboard" onClick={() => setMenuOpen(false)}>Partner</Link>
                  </Button>
                ) : null}
                {adminRole !== "instructor" && !isPartner && (
                  <Button variant="ghost" size="sm" className="flex-1" asChild>
                    <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  </Button>
                )}
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
        </>
      )}
    </header>
  );
}
