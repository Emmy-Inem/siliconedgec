import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Users, ArrowLeft, ChevronLeft, ChevronRight,
  BarChart3, MessageSquare, ShoppingBag, Briefcase, FileText, Settings,
  ClipboardCheck, Menu, X, Wallet, Plus, Minus, Search, Pin, PinOff,
} from "lucide-react";
import { Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoDark from "@/assets/logo-dark.png";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessibleSections } from "@/lib/admin-permissions";

type NavChild = { label: string; tab: string };
type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
};
type NavSection = { label: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "All Dashboards", href: "/admin/dashboards", icon: LayoutDashboard },
      {
        label: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        children: [
          { label: "Platform", tab: "platform" },
          { label: "Marketing", tab: "marketing" },
          { label: "Tracking QA", tab: "tracking-qa" },
          { label: "Auth Replay", tab: "auth-replay" },
          { label: "Course Health", tab: "course-health" },
          { label: "User Activity", tab: "user-activity" },
          { label: "Wishlist Insights", tab: "wishlist" },
        ],
      },
    ],
  },
  {
    label: "LMS",
    items: [
      {
        label: "Courses",
        href: "/admin/courses",
        icon: BookOpen,
        children: [
          { label: "Courses", tab: "courses" },
          { label: "Categories", tab: "categories" },
          { label: "Tags", tab: "tags" },
          { label: "Brands", tab: "brands" },
          { label: "Learning Paths", tab: "paths" },
          { label: "Reviews", tab: "reviews" },
          { label: "Certificates", tab: "certificates" },
          { label: "Instructors", tab: "instructors" },
        ],
      },
      {
        label: "Assessments",
        href: "/admin/assessments",
        icon: ClipboardCheck,
        children: [
          { label: "Quizzes", tab: "quizzes" },
          { label: "Quiz Attempts", tab: "attempts" },
          { label: "Assignments", tab: "assignments" },
          { label: "Submissions", tab: "submissions" },
        ],
      },
      {
        label: "People",
        href: "/admin/people",
        icon: Users,
        children: [
          { label: "Leads Hub", tab: "leads-hub" },
          { label: "Students", tab: "students" },
          { label: "At-Risk", tab: "at-risk" },
          { label: "Cohort Scorecard", tab: "cohort-metrics" },
          { label: "Enrollments", tab: "enrollments" },
          { label: "Access Grants", tab: "access-grants" },
          { label: "Webinar Registrations", tab: "registrations" },
          { label: "Business Leads", tab: "business-leads" },
          { label: "Q&A", tab: "qna" },
        ],
      },
      { label: "Cohorts", href: "/admin/cohorts", icon: Users2 },
    ],
  },
  {
    label: "Engagement",
    items: [
      {
        label: "Communication",
        href: "/admin/communication",
        icon: MessageSquare,
        children: [
          { label: "Announcements", tab: "announcements" },
          { label: "Notifications", tab: "notifications" },
          { label: "Live Classes", tab: "live-classes" },
          { label: "Live Chat", tab: "chat" },
          { label: "Email Blasts", tab: "email" },
          { label: "Email Templates", tab: "email-templates" },
        ],
      },
      {
        label: "Commerce",
        href: "/admin/commerce",
        icon: ShoppingBag,
        children: [
          { label: "Orders", tab: "orders" },
          { label: "Pricing Plans", tab: "pricing" },
          { label: "Promo Codes", tab: "promo-codes" },
          { label: "Bootcamps", tab: "bootcamps" },
          { label: "Cart Abandonment", tab: "cart-abandonment" },
          { label: "Influencer Marketing", tab: "influencers" },
        ],
      },
      {
        label: "Jobs",
        href: "/admin/jobs-hub",
        icon: Briefcase,
        children: [
          { label: "Job Listings", tab: "listings" },
          { label: "Applications", tab: "applications" },
        ],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Finance",
        href: "/admin/finance",
        icon: Wallet,
        children: [
          { label: "Ledger", tab: "ledger" },
          { label: "Refunds", tab: "refunds" },
          { label: "Payouts", tab: "payouts" },
          { label: "Tax Report", tab: "tax" },
        ],
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        label: "Content",
        href: "/admin/content-hub",
        icon: FileText,
        children: [
          { label: "Home Page", tab: "home" },
          { label: "Site Content", tab: "site" },
          { label: "Pages", tab: "pages" },
          { label: "Page Images", tab: "page-images" },
          { label: "Blog", tab: "blog" },
          { label: "Testimonials", tab: "testimonials" },
          { label: "Media Library", tab: "media" },
        ],
      },
      {
        label: "System",
        href: "/admin/system",
        icon: Settings,
        children: [
          { label: "Users & Roles", tab: "users" },
          { label: "Permissions", tab: "permissions" },
          { label: "Settings", tab: "settings" },
          { label: "Login Security", tab: "security" },
          { label: "Sessions", tab: "sessions" },
          { label: "Activity Log", tab: "activity" },
          { label: "SEO", tab: "seo" },
          { label: "Custom Scripts", tab: "scripts" },
          { label: "Backups", tab: "backups" },
          { label: "Webhooks", tab: "webhooks" },
          { label: "LMS Sync Health", tab: "lms-sync" },
          { label: "Help", tab: "help" },
        ],
      },
    ],
  },
];

// ---------- localStorage keys ----------
const LS_GROUPS = "admin.sidebar.expandedGroups.v1";
const LS_ITEMS = "admin.sidebar.expandedItems.v1";
const LS_PINS = "admin.sidebar.pinned.v1";

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}
function writeSet(key: string, s: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify(Array.from(s))); } catch { /* noop */ }
}

function itemKey(item: NavItem) { return item.href; }
function pinKey(href: string, tab?: string) { return tab ? `${href}?tab=${tab}` : href; }

function isItemActive(item: NavItem, pathname: string) {
  return pathname === item.href ||
    (item.href !== "/admin" && pathname.startsWith(item.href));
}

function SidebarContent({
  collapsed,
  onNavigate,
  filteredSections,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  filteredSections: NavSection[];
}) {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get("tab");

  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => readSet(LS_GROUPS));
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => readSet(LS_ITEMS));
  const [pinned, setPinned] = useState<Set<string>>(() => readSet(LS_PINS));

  // Auto-expand group + item containing the active route on first mount / route change.
  useEffect(() => {
    const activeSection = filteredSections.find((s) =>
      s.items.some((i) => isItemActive(i, location.pathname))
    );
    if (activeSection) {
      setExpandedGroups((prev) => {
        if (prev.has(activeSection.label)) return prev;
        const next = new Set(prev); next.add(activeSection.label);
        writeSet(LS_GROUPS, next); return next;
      });
      const activeItem = activeSection.items.find((i) => isItemActive(i, location.pathname));
      if (activeItem?.children?.length) {
        setExpandedItems((prev) => {
          if (prev.has(itemKey(activeItem))) return prev;
          const next = new Set(prev); next.add(itemKey(activeItem));
          writeSet(LS_ITEMS, next); return next;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      writeSet(LS_GROUPS, next); return next;
    });
  };
  const toggleItem = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      writeSet(LS_ITEMS, next); return next;
    });
  };
  const togglePin = (key: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      writeSet(LS_PINS, next); return next;
    });
  };

  // Search: filter items/children and force-expand matches
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return filteredSections;
    return filteredSections
      .map((s) => {
        const items = s.items
          .map((i) => {
            const itemMatch = i.label.toLowerCase().includes(q);
            const kids = (i.children ?? []).filter((c) => c.label.toLowerCase().includes(q));
            if (itemMatch) return i;
            if (kids.length) return { ...i, children: kids };
            return null;
          })
          .filter(Boolean) as NavItem[];
        return items.length ? { ...s, items } : null;
      })
      .filter(Boolean) as NavSection[];
  }, [q, filteredSections]);

  const searchForcingExpand = q.length > 0;

  // Build pinned list from all sections (not just filtered)
  const pinnedEntries = useMemo(() => {
    const list: { key: string; label: string; href: string; icon: NavItem["icon"]; tab?: string }[] = [];
    for (const s of filteredSections) {
      for (const i of s.items) {
        if (pinned.has(pinKey(i.href))) {
          list.push({ key: pinKey(i.href), label: i.label, href: i.href, icon: i.icon });
        }
        for (const c of i.children ?? []) {
          if (pinned.has(pinKey(i.href, c.tab))) {
            list.push({ key: pinKey(i.href, c.tab), label: `${i.label} · ${c.label}`, href: i.href, icon: i.icon, tab: c.tab });
          }
        }
      }
    }
    return list;
  }, [pinned, filteredSections]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {!collapsed && (
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search navigation…"
              className="w-full h-9 pl-8 pr-2 rounded-lg bg-muted/50 border border-border/50 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Search sidebar"
            />
          </div>
        </div>
      )}

      {!collapsed && pinnedEntries.length > 0 && !q && (
        <div className="px-3 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-1 mb-1.5 flex items-center gap-1">
            <Pin className="h-3 w-3" /> Pinned
          </p>
          <div className="space-y-0.5">
            {pinnedEntries.map((p) => {
              const to = p.tab ? `${p.href}?tab=${p.tab}` : p.href;
              const active = location.pathname === p.href && (!p.tab || currentTab === p.tab);
              return (
                <div key={p.key} className="group relative flex items-center">
                  <Link
                    to={to}
                    onClick={onNavigate}
                    className={cn(
                      "flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                      active
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <p.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{p.label}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); togglePin(p.key); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive"
                    aria-label={`Unpin ${p.label}`}
                  >
                    <PinOff className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <nav data-admin-sidebar-nav className="flex-1 overflow-y-auto scrollbar-hover-only px-3 pb-3 space-y-4">
        {filtered.map((section) => {
          const groupOpen = collapsed || searchForcingExpand || expandedGroups.has(section.label);
          return (
            <div key={section.label}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(section.label)}
                  className="w-full flex items-center justify-between px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  <span>{section.label}</span>
                  {groupOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </button>
              )}
              <AnimatePresence initial={false}>
                {groupOpen && (
                  <motion.div
                    initial={collapsed ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden mt-1 space-y-0.5"
                  >
                    {section.items.map((item) => {
                      const active = isItemActive(item, location.pathname);
                      const hasKids = !!item.children?.length;
                      const itemOpen =
                        !collapsed &&
                        hasKids &&
                        (searchForcingExpand || expandedItems.has(itemKey(item)) || active);
                      const pinnedThis = pinned.has(pinKey(item.href));
                      return (
                        <div key={item.href}>
                          <div className="group relative flex items-center">
                            <Link
                              to={item.href}
                              onClick={onNavigate}
                              title={collapsed ? item.label : undefined}
                              className={cn(
                                "flex-1 relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                                active
                                  ? "text-primary bg-primary/10 border border-primary/20"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              {!collapsed && (
                                <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                              )}
                            </Link>
                            {!collapsed && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); togglePin(pinKey(item.href)); }}
                                  className={cn(
                                    "p-1.5 rounded-md text-muted-foreground/60 hover:text-primary transition-opacity",
                                    pinnedThis ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-100"
                                  )}
                                  aria-label={pinnedThis ? `Unpin ${item.label}` : `Pin ${item.label}`}
                                >
                                  {pinnedThis ? <Pin className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                                </button>
                                {hasKids && (
                                  <button
                                    type="button"
                                    onClick={() => toggleItem(itemKey(item))}
                                    className="p-1.5 rounded-md text-muted-foreground/70 hover:text-foreground"
                                    aria-label={itemOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                                  >
                                    {itemOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          <AnimatePresence initial={false}>
                            {itemOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.12 }}
                                className="overflow-hidden ml-5 pl-3 border-l border-border/60 mt-0.5 space-y-0.5"
                              >
                                {item.children!.map((child) => {
                                  const childActive = active && currentTab === child.tab;
                                  const cKey = pinKey(item.href, child.tab);
                                  const cPinned = pinned.has(cKey);
                                  return (
                                    <div key={child.tab} className="group flex items-center">
                                      <Link
                                        to={`${item.href}?tab=${child.tab}`}
                                        onClick={onNavigate}
                                        className={cn(
                                          "flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
                                          childActive
                                            ? "text-primary font-medium"
                                            : "text-muted-foreground/80 hover:text-foreground"
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "h-1.5 w-1.5 rounded-full shrink-0",
                                            childActive ? "bg-primary" : "bg-muted-foreground/40"
                                          )}
                                        />
                                        <span className="truncate">{child.label}</span>
                                      </Link>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); togglePin(cKey); }}
                                        className={cn(
                                          "p-1 text-muted-foreground/60 hover:text-primary transition-opacity",
                                          cPinned ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-100"
                                        )}
                                        aria-label={cPinned ? `Unpin ${child.label}` : `Pin ${child.label}`}
                                      >
                                        <Pin className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {q && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground/70 px-3 py-2">No matches for “{query}”.</p>
        )}
      </nav>
    </div>
  );
}

export function AdminSidebar() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobilePanelRef = useRef<HTMLElement | null>(null);
  const mobileOpenButtonRef = useRef<HTMLButtonElement | null>(null);
  const { adminRole } = useAuth();
  const location = useLocation();

  // Always close the mobile drawer on route change and on Escape.
  useEffect(() => { setMobileOpen(false); }, [location.pathname, location.search]);
  useEffect(() => { if (!isMobile) setMobileOpen(false); }, [isMobile]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Lock body scroll while drawer is open on mobile
  useEffect(() => {
    if (!isMobile) return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen, isMobile]);

  const allowedSections = getAccessibleSections(adminRole);
  const filteredSections = allowedSections
    ? sections.filter((s) => allowedSections.includes(s.label))
    : sections;

  if (isMobile) {
    const closeMobile = () => setMobileOpen(false);
    return (
      <>
        {/* Overlay: always mounted, toggled with pointer-events + opacity for reliable dismiss on touch */}
        <div
          aria-hidden={!mobileOpen}
          onClick={closeMobile}
          className={cn(
            "fixed inset-0 bg-foreground/50 z-40 transition-opacity duration-200",
            mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        />
        {/* Drawer: always mounted, slides via CSS transform. Avoids AnimatePresence exit races. */}
        <aside
          ref={mobilePanelRef as any}
          aria-hidden={!mobileOpen}
          className={cn(
            "fixed left-0 top-0 bottom-0 w-[280px] bg-card border-r border-border z-50 flex flex-col shadow-2xl transition-transform duration-200 ease-out will-change-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
          )}
        >
          <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0">
            <Link to="/admin" onClick={closeMobile}>
              <img src={logoDark} alt="Silicon Edge" className="h-7 w-auto" />
            </Link>
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Close menu"
              className="relative z-10 -mr-2 p-3 rounded-lg text-foreground hover:bg-muted active:bg-muted/70 touch-manipulation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SidebarContent collapsed={false} onNavigate={closeMobile} filteredSections={filteredSections} />
          <div className="p-3 border-t border-border">
            <Link
              to="/"
              onClick={closeMobile}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>Back to Site</span>
            </Link>
          </div>
        </aside>
        {!mobileOpen && (
          <button
            ref={mobileOpenButtonRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            className="fixed bottom-4 left-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center md:hidden ring-2 ring-background"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </>
    );
  }

  return (
    <aside className={cn(
      "bg-card border-r border-border flex flex-col transition-all duration-300 shrink-0 relative",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="h-16 border-b border-border flex items-center justify-between px-4">
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <Link to="/admin">
                <img src={logoDark} alt="Silicon Edge" className="h-7 w-auto" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </motion.button>
      </div>

      <SidebarContent collapsed={collapsed} filteredSections={filteredSections} />

      <div className="p-3 border-t border-border">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                Back to Site
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>
    </aside>
  );
}
