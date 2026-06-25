import { useMemo, useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { ALL_STAFF_ROLES, ROLE_LABEL, StaffRole } from "@/lib/admin-permissions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { ShieldCheck, RotateCcw } from "lucide-react";

// Editable roles in the matrix (admin always has access — not editable).
const EDITABLE_ROLES: Exclude<StaffRole, "admin">[] = [
  "moderator",
  "instructor",
  "support",
  "finance",
  "content_editor",
];

// Route catalogue grouped for the UI. Mirrors hubs the admin can reach.
const ROUTE_GROUPS: { label: string; routes: { path: string; label: string }[] }[] = [
  {
    label: "Workspace",
    routes: [
      { path: "/admin", label: "Overview" },
      { path: "/admin/analytics", label: "Analytics hub" },
      { path: "/admin/marketing", label: "Marketing analytics" },
    ],
  },
  {
    label: "LMS",
    routes: [
      { path: "/admin/courses", label: "Courses hub" },
      { path: "/admin/assessments", label: "Assessments hub" },
      { path: "/admin/people", label: "People hub" },
      { path: "/admin/students", label: "Students" },
      { path: "/admin/enrollments", label: "Enrollments" },
      { path: "/admin/instructors", label: "Instructors" },
      { path: "/admin/quizzes", label: "Quizzes" },
      { path: "/admin/quiz-attempts", label: "Quiz attempts" },
      { path: "/admin/qna", label: "Q&A" },
      { path: "/admin/live-classes", label: "Live classes" },
      { path: "/admin/categories", label: "Categories" },
      { path: "/admin/tags", label: "Tags" },
      { path: "/admin/paths", label: "Learning paths" },
    ],
  },
  {
    label: "Engagement",
    routes: [
      { path: "/admin/communication", label: "Communication hub" },
      { path: "/admin/chat", label: "Live chat" },
      { path: "/admin/announcements", label: "Announcements" },
      { path: "/admin/notifications", label: "Notifications" },
      { path: "/admin/email", label: "Email" },
      { path: "/admin/email-templates", label: "Email templates" },
      { path: "/admin/testimonials", label: "Testimonials" },
      { path: "/admin/leads-hub", label: "Leads" },
      { path: "/admin/business-leads", label: "Business leads" },
      { path: "/admin/registrations", label: "Webinar registrations" },
    ],
  },
  {
    label: "Commerce",
    routes: [
      { path: "/admin/commerce", label: "Commerce hub" },
      { path: "/admin/orders", label: "Orders" },
      { path: "/admin/pricing", label: "Pricing plans" },
      { path: "/admin/influencers-marketing", label: "Influencer marketing" },
      { path: "/admin/cart-abandonment", label: "Cart abandonment" },
    ],
  },
  {
    label: "Finance",
    routes: [
      { path: "/admin/finance", label: "Finance hub" },
    ],
  },
  {
    label: "Content",
    routes: [
      { path: "/admin/content-hub", label: "Content hub" },
      { path: "/admin/blog", label: "Blog" },
      { path: "/admin/pages", label: "Pages" },
      { path: "/admin/media", label: "Media library" },
      { path: "/admin/home-content", label: "Home content" },
      { path: "/admin/seo", label: "SEO" },
      { path: "/admin/content", label: "Site content" },
    ],
  },
  {
    label: "Jobs",
    routes: [
      { path: "/admin/jobs-hub", label: "Jobs hub" },
      { path: "/admin/jobs", label: "Jobs" },
      { path: "/admin/job-applications", label: "Job applications" },
    ],
  },
];

const DEFAULT_MATRIX: Record<Exclude<StaffRole, "admin">, string[]> = {
  moderator: [
    "/admin", "/admin/analytics", "/admin/courses", "/admin/categories",
    "/admin/tags", "/admin/paths", "/admin/students", "/admin/enrollments",
    "/admin/quizzes", "/admin/quiz-attempts", "/admin/qna",
    "/admin/announcements", "/admin/testimonials", "/admin/instructors",
    "/admin/live-classes", "/admin/assessments", "/admin/people",
    "/admin/communication", "/admin/content-hub",
  ],
  instructor: [
    "/admin", "/admin/courses", "/admin/assessments", "/admin/quizzes",
    "/admin/quiz-attempts", "/admin/qna", "/admin/students",
    "/admin/live-classes", "/admin/announcements", "/admin/people",
  ],
  support: [
    "/admin", "/admin/chat", "/admin/leads-hub", "/admin/business-leads",
    "/admin/registrations", "/admin/qna", "/admin/communication",
    "/admin/notifications",
  ],
  finance: [
    "/admin", "/admin/analytics", "/admin/commerce", "/admin/orders",
    "/admin/pricing", "/admin/influencers-marketing", "/admin/finance",
    "/admin/marketing",
  ],
  content_editor: [
    "/admin", "/admin/content-hub", "/admin/seo", "/admin/media",
    "/admin/testimonials", "/admin/home-content", "/admin/content",
  ],
};

export default function AdminPermissions() {
  const { data: rows = [], isLoading } = useRolePermissions();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const lookup = useMemo(() => {
    const m = new Map<string, boolean>();
    rows.forEach((r) => m.set(`${r.role}|${r.route}`, r.allowed));
    return m;
  }, [rows]);

  const toggle = useMutation({
    mutationFn: async ({ role, route, value }: { role: StaffRole; route: string; value: boolean }) => {
      const { error } = await (supabase as any)
        .from("role_permissions")
        .upsert(
          { role, route, allowed: value, updated_at: new Date().toISOString() },
          { onConflict: "role,route" },
        );
      if (error) throw error;
      await logAdminActivity("update_permission", "role", `${role}:${route}`, { value });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role-permissions"] }),
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
    onSettled: () => setSaving(null),
  });

  const resetDefaults = useMutation({
    mutationFn: async () => {
      const upserts: { role: StaffRole; route: string; allowed: boolean; updated_at: string }[] = [];
      const now = new Date().toISOString();
      for (const role of EDITABLE_ROLES) {
        const allowed = new Set(DEFAULT_MATRIX[role]);
        for (const group of ROUTE_GROUPS) {
          for (const r of group.routes) {
            upserts.push({ role, route: r.path, allowed: allowed.has(r.path), updated_at: now });
          }
        }
      }
      const { error } = await (supabase as any)
        .from("role_permissions")
        .upsert(upserts, { onConflict: "role,route" });
      if (error) throw error;
      await logAdminActivity("reset_permissions", "role", "all", { rows: upserts.length });
    },
    onSuccess: () => {
      toast({ title: "Defaults restored", description: "Permission matrix reset." });
      qc.invalidateQueries({ queryKey: ["role-permissions"] });
    },
    onError: (e: any) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold">Role permissions</h2>
            <p className="text-xs text-muted-foreground">
              Toggle which admin routes each staff role can access. Admin has full access and is not listed.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => resetDefaults.mutate()} disabled={resetDefaults.isPending}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          {resetDefaults.isPending ? "Resetting…" : "Reset to defaults"}
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading matrix…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Route</th>
                {EDITABLE_ROLES.map((r) => (
                  <th key={r} className="text-center px-3 py-3 font-semibold whitespace-nowrap">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROUTE_GROUPS.map((group) => (
                <>
                  <tr key={`g-${group.label}`} className="bg-muted/20">
                    <td colSpan={EDITABLE_ROLES.length + 1} className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {group.label}
                    </td>
                  </tr>
                  {group.routes.map((route) => (
                    <tr key={route.path} className="border-t border-border hover:bg-muted/10">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{route.label}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{route.path}</div>
                      </td>
                      {EDITABLE_ROLES.map((role) => {
                        const key = `${role}|${route.path}`;
                        const checked = lookup.get(key) ?? false;
                        const id = `perm-${role}-${route.path}`;
                        return (
                          <td key={role} className="text-center px-3 py-2.5">
                            <Switch
                              id={id}
                              checked={checked}
                              disabled={saving === key}
                              onCheckedChange={(v) => {
                                setSaving(key);
                                toggle.mutate({ role, route: route.path, value: v });
                              }}
                              aria-label={`${ROLE_LABEL[role]} can access ${route.label}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}