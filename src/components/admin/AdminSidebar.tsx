import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Users, GraduationCap, MessageSquareQuote,
  CreditCard, UserCheck, FileText, ArrowLeft, ChevronLeft, ChevronRight, Megaphone, BarChart3, Mail, Activity, Settings,
  FolderTree, Tag, Route, HelpCircle, Bell, ClipboardCheck, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoDark from "@/assets/logo-dark.png";

const sections = [
  {
    label: "Dashboard",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Tutor LMS",
    items: [
      { label: "Learning Paths", href: "/admin/paths", icon: Route },
      { label: "Courses", href: "/admin/courses", icon: BookOpen },
      { label: "Categories", href: "/admin/categories", icon: FolderTree },
      { label: "Tags", href: "/admin/tags", icon: Tag },
    ],
  },
  {
    label: "Students",
    items: [
      { label: "Students", href: "/admin/students", icon: Users },
      { label: "Enrollments", href: "/admin/enrollments", icon: GraduationCap },
      { label: "Quizzes", href: "/admin/quizzes", icon: ClipboardCheck },
      { label: "Quiz Attempts", href: "/admin/quiz-attempts", icon: ClipboardCheck },
      { label: "Q&A", href: "/admin/qna", icon: HelpCircle },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Announcements", href: "/admin/announcements", icon: Bell },
      { label: "Email & Blasts", href: "/admin/email", icon: Mail },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Marketing Analytics", href: "/admin/marketing", icon: Target },
      { label: "Influencer Marketing", href: "/admin/influencers-marketing", icon: Megaphone },
      { label: "Pricing Plans", href: "/admin/pricing", icon: CreditCard },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Instructors", href: "/admin/instructors", icon: UserCheck },
      { label: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
      { label: "Site Content", href: "/admin/content", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Users & Roles", href: "/admin/users", icon: Users },
      { label: "Activity Log", href: "/admin/activity-log", icon: Activity },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {sections.map((section) => (
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
