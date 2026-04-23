import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Users, ArrowLeft, ChevronLeft, ChevronRight,
  BarChart3, MessageSquare, ShoppingBag, Briefcase, FileText, Settings,
  ClipboardCheck, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoDark from "@/assets/logo-dark.png";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessibleSections } from "@/lib/admin-permissions";

const sections = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "LMS",
    items: [
      { label: "Courses", href: "/admin/courses", icon: BookOpen },
      { label: "Assessments", href: "/admin/assessments", icon: ClipboardCheck },
      { label: "People", href: "/admin/people", icon: Users },
    ],
  },
  {
    label: "Engagement",
    items: [
      { label: "Communication", href: "/admin/communication", icon: MessageSquare },
      { label: "Commerce", href: "/admin/commerce", icon: ShoppingBag },
      { label: "Jobs", href: "/admin/jobs-hub", icon: Briefcase },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Content", href: "/admin/content-hub", icon: FileText },
      { label: "System", href: "/admin/system", icon: Settings },
    ],
  },
];

function SidebarContent({ collapsed, onNavigate, filteredSections }: { collapsed: boolean; onNavigate?: () => void; filteredSections: typeof sections }) {
  const location = useLocation();

  return (
    <nav data-admin-sidebar-nav className="flex-1 overflow-y-auto scrollbar-hover-only p-3 space-y-5">
      {filteredSections.map((section) => (
        <div key={section.label}>
          <AnimatePresence>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 mb-2"
              >
                {section.label}
              </motion.p>
            )}
          </AnimatePresence>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = location.pathname === item.href ||
                (item.href !== "/admin" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  {!active && (
                    <div className="absolute inset-0 rounded-xl hover:bg-muted transition-colors" />
                  )}
                  <item.icon className="h-4 w-4 shrink-0 relative z-10" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="relative z-10 whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { adminRole } = useAuth();

  const allowedSections = getAccessibleSections(adminRole);
  const filteredSections = allowedSections
    ? sections.filter((s) => allowedSections.includes(s.label))
    : sections;

  if (isMobile) {
    return (
      <>
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed left-0 top-0 bottom-0 w-[280px] bg-card border-r border-border z-50 flex flex-col"
              >
                <div className="h-16 border-b border-border flex items-center justify-between px-4">
                  <Link to="/admin" onClick={() => setMobileOpen(false)}>
                    <img src={logoDark} alt="Silicon Edge" className="h-7 w-auto" />
                  </Link>
                  <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} filteredSections={filteredSections} />
                <div className="p-3 border-t border-border">
                  <Link
                    to="/"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    <span>Back to Site</span>
                  </Link>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-4 left-4 z-30 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
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
