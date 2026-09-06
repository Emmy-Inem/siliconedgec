import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessibleSections } from "@/lib/admin-permissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminFeature {
  label: string;
  href: string;
  section: string;
  keywords?: string;
}

// `section` values here must be from the real vocabulary returned by
// getAccessibleSections() in src/lib/admin-permissions.ts (Workspace / LMS /
// Engagement / Finance / Content / Platform) — every non-admin staff role's
// results are filtered against this list, so a section name that doesn't
// exist in that vocabulary silently hides the entry for every such role.
const ALL_FEATURES: AdminFeature[] = [
  { label: "Overview", href: "/admin", section: "Workspace" },
  { label: "Analytics", href: "/admin/analytics", section: "Workspace", keywords: "stats charts" },
  { label: "Marketing Analytics", href: "/admin/marketing", section: "Workspace", keywords: "utm funnel" },
  { label: "User Activity", href: "/admin/user-activity", section: "Workspace", keywords: "students drilldown" },
  { label: "Learning Paths", href: "/admin/paths", section: "LMS" },
  { label: "Products (Courses)", href: "/admin/courses", section: "LMS", keywords: "course product catalog" },
  { label: "Categories", href: "/admin/categories", section: "LMS" },
  { label: "Tags", href: "/admin/tags", section: "LMS" },
  { label: "Brands", href: "/admin/brands", section: "LMS" },
  { label: "Reviews", href: "/admin/reviews", section: "LMS" },
  { label: "Instructors", href: "/admin/instructors", section: "LMS" },
  { label: "Instructor Assist", href: "/admin/assessments?tab=assist", section: "LMS", keywords: "ai grading help" },
  { label: "Leads & Enrollments Hub", href: "/admin/leads-hub", section: "LMS", keywords: "centralized timeline" },
  { label: "Students", href: "/admin/students", section: "LMS" },
  { label: "Enrollments", href: "/admin/enrollments", section: "LMS" },
  { label: "Lesson Access", href: "/admin/people?tab=lesson-access", section: "LMS", keywords: "grant unlock" },
  { label: "Webinar Registrations", href: "/admin/registrations", section: "LMS", keywords: "free signup" },
  { label: "Business Leads", href: "/admin/business-leads", section: "LMS", keywords: "b2b corporate" },
  { label: "Quizzes", href: "/admin/quizzes", section: "LMS" },
  { label: "Quiz Attempts", href: "/admin/quiz-attempts", section: "LMS" },
  { label: "Q&A", href: "/admin/qna", section: "LMS" },
  { label: "Cohorts", href: "/admin/cohorts", section: "LMS" },
  { label: "Announcements", href: "/admin/announcements", section: "Engagement" },
  { label: "Email & Blasts", href: "/admin/email", section: "Engagement" },
  { label: "Email Templates", href: "/admin/email-templates", section: "Engagement" },
  { label: "Email Delivery", href: "/admin/communication?tab=email-delivery", section: "Engagement", keywords: "bounce log" },
  { label: "Email Queue", href: "/admin/communication?tab=email-queue", section: "Engagement" },
  { label: "Newsletter", href: "/admin/communication?tab=newsletter", section: "Engagement", keywords: "subscribers campaign" },
  { label: "Automations", href: "/admin/communication?tab=automations", section: "Engagement", keywords: "workflow triggers" },
  { label: "Live Chat", href: "/admin/chat", section: "Engagement" },
  { label: "Live Classes", href: "/admin/live-classes", section: "Engagement", keywords: "zoom webinar" },
  { label: "Support Tickets", href: "/admin/communication?tab=tickets", section: "Engagement", keywords: "help desk" },
  { label: "Orders", href: "/admin/orders", section: "Engagement" },
  { label: "Influencer Marketing", href: "/admin/influencers-marketing", section: "Engagement", keywords: "promo code utm referral link" },
  { label: "Affiliates", href: "/admin/commerce?tab=affiliates", section: "Engagement", keywords: "partner commission payout" },
  { label: "Pricing Plans", href: "/admin/pricing", section: "Engagement" },
  { label: "Bootcamps", href: "/admin/commerce?tab=bootcamps", section: "Engagement", keywords: "installment cohort" },
  { label: "Cart Abandonment", href: "/admin/commerce?tab=cart-abandonment", section: "Engagement" },
  { label: "Job Listings", href: "/admin/jobs", section: "Engagement" },
  { label: "Applications", href: "/admin/job-applications", section: "Engagement" },
  { label: "Finance Ledger", href: "/admin/finance", section: "Finance" },
  { label: "Refunds", href: "/admin/finance?tab=refunds", section: "Finance" },
  { label: "Payouts", href: "/admin/finance?tab=payouts", section: "Finance" },
  { label: "Installments", href: "/admin/finance?tab=installments", section: "Finance", keywords: "payment plan" },
  { label: "Tax Report", href: "/admin/finance?tab=tax", section: "Finance" },
  { label: "Testimonials", href: "/admin/testimonials", section: "Content" },
  { label: "Site Content", href: "/admin/content", section: "Content" },
  { label: "Blog Posts", href: "/admin/blog", section: "Content" },
  { label: "Pages", href: "/admin/pages", section: "Content", keywords: "cms" },
  { label: "Media Library", href: "/admin/media", section: "Content" },
  { label: "Users & Roles", href: "/admin/users", section: "Platform" },
  { label: "Permissions", href: "/admin/system?tab=permissions", section: "Platform", keywords: "role access" },
  { label: "Activity Log", href: "/admin/activity-log", section: "Platform", keywords: "admin actions audit" },
  { label: "SEO Manager", href: "/admin/seo", section: "Platform" },
  { label: "Custom Scripts", href: "/admin/custom-scripts", section: "Platform", keywords: "tracking pixels" },
  { label: "Settings", href: "/admin/settings", section: "Platform" },
  { label: "Blocked IPs", href: "/admin/system?tab=blocked-ips", section: "Platform", keywords: "security ban" },
  { label: "GDPR Tools", href: "/admin/system?tab=gdpr", section: "Platform", keywords: "export erase privacy" },
  { label: "Maintenance", href: "/admin/system?tab=maintenance", section: "Platform" },
];

export function AdminSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();
  const { adminRole } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const allowed = getAccessibleSections(adminRole);
  const features = useMemo(
    () => allowed ? ALL_FEATURES.filter((f) => allowed.includes(f.section)) : ALL_FEATURES,
    [allowed]
  );

  // Lazily index lessons, quizzes, assignments and courses so admins can
  // jump straight to a specific item from the ⌘K palette.
  const { data: deepIndex = [] } = useQuery({
    queryKey: ["admin-search-deep-index"],
    enabled: open,
    staleTime: 60_000,
    queryFn: async (): Promise<AdminFeature[]> => {
      const [lessons, quizzes, assignments, courses] = await Promise.all([
        supabase.from("lessons").select("id, title, modules(course_id)").limit(500),
        supabase.from("quizzes").select("id, title").limit(300),
        supabase.from("assignments").select("id, title").limit(300),
        supabase.from("courses").select("id, title").limit(200),
      ]);
      const out: AdminFeature[] = [];
      (lessons.data ?? []).forEach((l: any) => out.push({
        label: l.title, href: l.modules?.course_id ? `/admin/courses/${l.modules.course_id}/modules` : "/admin/courses",
        section: "Lessons", keywords: "lesson content",
      }));
      (quizzes.data ?? []).forEach((q: any) => out.push({
        label: q.title, href: "/admin/assessments?tab=quizzes", section: "Quizzes", keywords: "quiz assessment",
      }));
      (assignments.data ?? []).forEach((a: any) => out.push({
        label: a.title, href: "/admin/assessments?tab=assignments", section: "Assignments", keywords: "assignment homework",
      }));
      (courses.data ?? []).forEach((c: any) => out.push({
        label: c.title, href: `/admin/courses/${c.id}/modules`, section: "Course Detail", keywords: "curriculum",
      }));
      return out;
    },
  });

  const allFeatures = useMemo(() => [...features, ...deepIndex], [features, deepIndex]);

  const results = useMemo(() => {
    const query = q.toLowerCase().trim();
    if (!query) return features.slice(0, 8);
    return allFeatures
      .filter((f) =>
        f.label.toLowerCase().includes(query) ||
        f.section.toLowerCase().includes(query) ||
        (f.keywords ?? "").toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [features, allFeatures, q]);

  useEffect(() => { setActiveIdx(0); }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    navigate(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted text-xs transition-colors min-w-[220px]"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search admin features...</span>
        <kbd className="ml-auto px-1.5 py-0.5 rounded bg-background text-[10px] font-mono border border-border">⌘K</kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground"
        aria-label="Search admin"
      >
        <Search className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[92vw] max-w-xl z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 border-b border-border">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
                    else if (e.key === "Enter" && results[activeIdx]) { go(results[activeIdx].href); }
                  }}
                  placeholder="Search any admin feature..."
                  className="border-0 focus-visible:ring-0 h-12 text-base"
                />
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {results.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">No matches</p>
                ) : (
                  results.map((r, i) => (
                    <button
                      key={r.href}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => go(r.href)}
                      className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                        i === activeIdx ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{r.label}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.section}</p>
                      </div>
                      <Command className="h-3.5 w-3.5 opacity-40" />
                    </button>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground flex items-center justify-between">
                <span>↑↓ navigate · ↵ open</span>
                <span>esc to close</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
