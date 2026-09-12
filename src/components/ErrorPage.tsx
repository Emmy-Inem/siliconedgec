import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Home,
  GraduationCap,
  RefreshCw,
  Search,
  BookOpen,
  LifeBuoy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoLight from "@/assets/logo-light.png";

interface ErrorPageProps {
  error?: Error | null;
  resetErrorBoundary?: () => void;
  title?: string;
  message?: string;
  statusCode?: string;
}

export function ErrorPage({
  error,
  resetErrorBoundary,
  title = "Something went wrong",
  message = "We encountered an unexpected error while loading this page. Our team has been alerted, and you can easily jump back to safety.",
  statusCode = "500",
}: ErrorPageProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    const targetUrl = `/courses?q=${encodeURIComponent(q)}`;
    if (navigate) {
      navigate(targetUrl);
    } else {
      window.location.href = targetUrl;
    }
  };

  const handleCopy = () => {
    if (!error) return;
    const text = `${error.name}: ${error.message}\n${error.stack || ""}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleReload = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  const popularLinks = [
    { label: "All Courses", href: "/courses", icon: GraduationCap, desc: "Explore our expert-led curriculum" },
    { label: "Live Cohorts", href: "/cohorts", icon: BookOpen, desc: "Join cohort-based tech training" },
    { label: "Silicon Edge Bootcamps", href: "/bootcamp", icon: ArrowRight, desc: "Accelerate your tech career" },
    { label: "Help & Support", href: "/support", icon: LifeBuoy, desc: "Get help from our support team" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      <Helmet>
        <title>{`${title} | Silicon Edge Consulting`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Top minimal navigation bar */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logoLight} alt="Silicon Edge Consulting" className="h-8 w-auto transition-transform group-hover:scale-105" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Home</Link>
            </Button>
            <Button asChild variant="default" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/courses">
                <GraduationCap className="h-4 w-4 mr-1.5" /> Browse Courses
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Error Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12 md:py-20 flex flex-col items-center justify-center text-center">
        {/* Glowing badge */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-xl opacity-75 animate-pulse" />
          <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <AlertTriangle className="h-3.5 w-3.5" /> Error {statusCode}
          </div>
        </div>

        {/* Heading */}
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
          {title}
        </h1>

        <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          {message}
        </p>

        {/* Primary Call-to-Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mb-10">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all h-12"
          >
            <Link to="/courses">
              <GraduationCap className="h-5 w-5 mr-2" />
              Browse Courses
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto flex-1 border-border/80 hover:bg-muted/80 h-12"
          >
            <Link to="/">
              <Home className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={handleReload}
            className="w-full sm:w-auto text-muted-foreground hover:text-foreground h-12 px-3"
            title="Reload page"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>

        {/* Quick Search for Courses */}
        <div className="w-full max-w-lg mb-12">
          <form
            onSubmit={handleSearch}
            className="relative flex items-center"
          >
            <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for courses (AWS, Cloud, DevOps, AI, Cyber)..."
              className="w-full pl-10 pr-24 py-3 text-sm rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1.5 h-8 px-3 rounded-lg"
              disabled={!searchQuery.trim()}
            >
              Search
            </Button>
          </form>
        </div>

        {/* Popular Destination Cards */}
        <div className="w-full max-w-2xl text-left mb-8">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center sm:text-left">
            Or explore these popular destinations:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {popularLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="group flex items-start gap-3 p-3.5 rounded-xl border border-border/60 bg-card/40 hover:bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Optional Collapsible Technical Details (for support & debugging) */}
        {error && (
          <div className="w-full max-w-2xl text-left border-t border-border/60 pt-6 mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <span>{showDetails ? "Hide technical diagnostic details" : "Show technical diagnostic details"}</span>
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showDetails && (
              <div className="mt-3 p-4 rounded-xl border border-border/60 bg-muted/40 font-mono text-xs text-muted-foreground overflow-x-auto relative">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/40">
                  <span className="font-semibold text-foreground">Diagnostic Stack</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy details"}
                  </Button>
                </div>
                <p className="text-destructive font-semibold mb-1">{error.name}: {error.message}</p>
                {error.stack && (
                  <pre className="whitespace-pre-wrap text-[11px] leading-relaxed opacity-80">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Silicon Edge Consulting. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default ErrorPage;
