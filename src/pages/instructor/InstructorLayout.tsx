import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  MessagesSquare,
  ClipboardList,
  FileCheck2,
  LogOut,
  GraduationCap,
  Loader2,
  ChevronsUpDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";
import { useEffect, useRef } from "react";
import {
  useInstructorCohorts,
  useActiveInstructorCohort,
} from "@/hooks/useInstructorCohorts";

const NAV = [
  { to: "/instructor", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/instructor/students", label: "Students", icon: Users },
  { to: "/instructor/cohort", label: "Cohort Space", icon: MessagesSquare },
  { to: "/instructor/assignments", label: "Assignments", icon: FileCheck2 },
  { to: "/instructor/quizzes", label: "Quizzes", icon: ClipboardList },
  { to: "/instructor/assist", label: "Instructor Assist", icon: Sparkles },
];

export default function InstructorLayout() {
  const { user, adminRole, loading, signOut } = useAuth();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  const { data: cohorts, isLoading: cohortsLoading } = useInstructorCohorts();
  const { activeId, active, setActive } = useActiveInstructorCohort(cohorts);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/sign-in" replace />;
  if (adminRole !== "instructor" && adminRole !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="h-screen overflow-hidden flex w-full bg-background">
      <SEO title="Instructor Dashboard · Silicon Edge" description="Manage cohorts, grade work, and support your students." />
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-card/40 flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
          <GraduationCap className="h-5 w-5 text-primary" />
          <div>
            <div className="font-heading font-semibold text-sm leading-tight">Instructor</div>
            <div className="text-[10px] text-muted-foreground">Silicon Edge</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          <div className="truncate mb-2">{user.email}</div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start">
            <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between gap-3 px-4 sm:px-6 bg-card/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <GraduationCap className="h-4 w-4 text-primary md:hidden" />
            <h1 className="font-heading font-semibold text-sm sm:text-base truncate">Instructor Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            {cohortsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (cohorts ?? []).length > 0 ? (
              <Select value={activeId ?? undefined} onValueChange={(v) => setActive(v)}>
                <SelectTrigger className="w-[200px] sm:w-[260px] h-9">
                  <ChevronsUpDown className="h-3.5 w-3.5 mr-1 opacity-60" />
                  <SelectValue placeholder="Select cohort" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts!.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.course_title ? ` · ${c.course_title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs text-muted-foreground">No cohorts assigned</span>
            )}
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden border-b border-border bg-card/40 px-2 py-2 flex gap-1 overflow-x-auto no-scrollbar">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs shrink-0 whitespace-nowrap",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )
              }
            >
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </NavLink>
          ))}
        </nav>

        <main ref={mainRef as any} className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet context={{ activeCohort: active, cohorts: cohorts ?? [] }} />
        </main>
      </div>
    </div>
  );
}

// Helper for child pages to grab context typed.
export type InstructorOutletContext = {
  activeCohort: import("@/hooks/useInstructorCohorts").InstructorCohort | null;
  cohorts: import("@/hooks/useInstructorCohorts").InstructorCohort[];
};