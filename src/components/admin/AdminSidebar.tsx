import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, BookOpen, Users, GraduationCap, MessageSquareQuote, 
  CreditCard, UserCheck, FileText, ArrowLeft, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import logoDark from "@/assets/logo-dark.png";

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Instructors", href: "/admin/instructors", icon: UserCheck },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Enrollments", href: "/admin/enrollments", icon: GraduationCap },
  { label: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
  { label: "Pricing Plans", href: "/admin/pricing", icon: CreditCard },
  { label: "Site Content", href: "/admin/content", icon: FileText },
];

export function AdminSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "bg-card border-r border-border flex flex-col transition-all duration-300 shrink-0",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="h-16 border-b border-border flex items-center justify-between px-4">
        {!collapsed && (
          <Link to="/admin">
            <img src={logoDark} alt="Silicon Edge" className="h-7 w-auto" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.href || 
            (item.href !== "/admin" && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Back to Site</span>}
        </Link>
      </div>
    </aside>
  );
}
