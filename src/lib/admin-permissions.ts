export type StaffRole =
  | "admin"
  | "moderator"
  | "instructor"
  | "support"
  | "finance"
  | "content_editor";

export type AdminRole = StaffRole | null;

export const ALL_STAFF_ROLES: StaffRole[] = [
  "admin",
  "moderator",
  "instructor",
  "support",
  "finance",
  "content_editor",
];

// Higher number = higher privilege. Used to pick a single "primary" role
// when a user holds multiple roles.
export const ROLE_RANK: Record<StaffRole, number> = {
  admin: 100,
  moderator: 60,
  finance: 50,
  instructor: 40,
  support: 30,
  content_editor: 20,
};

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Admin",
  moderator: "Moderator",
  instructor: "Instructor",
  support: "Support",
  finance: "Finance",
  content_editor: "Content Editor",
};

// Hardcoded fallback used until the DB matrix loads, and merged with the DB
// matrix so a corrupted/empty matrix never locks staff out of baseline routes.
const FALLBACK_ALLOWED: Record<Exclude<StaffRole, "admin">, string[]> = {
  moderator: [
    "/admin", "/admin/analytics", "/admin/courses", "/admin/courses/new",
    "/admin/categories", "/admin/tags", "/admin/paths", "/admin/students",
    "/admin/enrollments", "/admin/quizzes", "/admin/quiz-attempts",
    "/admin/qna", "/admin/announcements", "/admin/testimonials",
    "/admin/instructors", "/admin/live-classes", "/admin/assessments",
    "/admin/people", "/admin/communication", "/admin/content-hub",
    "/admin/cohorts",
  ],
  instructor: [
    "/admin", "/admin/courses", "/admin/assessments", "/admin/quizzes",
    "/admin/quiz-attempts", "/admin/qna", "/admin/students",
    "/admin/live-classes", "/admin/announcements", "/admin/people",
    "/admin/cohorts",
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

// Snapshot of the latest role_permissions matrix loaded from the DB.
// useRolePermissions calls setRolePermissionsMatrix on every successful fetch
// so canAccessRoute reflects admin edits without a page reload.
let DB_MATRIX: Partial<Record<StaffRole, Set<string>>> | null = null;

export function setRolePermissionsMatrix(
  rows: { role: StaffRole; route: string; allowed: boolean }[],
) {
  const next: Partial<Record<StaffRole, Set<string>>> = {};
  for (const r of rows) {
    if (!r.allowed) continue;
    const set = next[r.role] ?? new Set<string>();
    set.add(r.route);
    next[r.role] = set;
  }
  DB_MATRIX = next;
}

function allowedSetFor(role: Exclude<StaffRole, "admin">): Set<string> {
  const fb = FALLBACK_ALLOWED[role] ?? [];
  const db = DB_MATRIX?.[role];
  if (!db) return new Set(fb);
  return new Set([...fb, ...Array.from(db)]);
}

export function canAccessRoute(role: AdminRole, path: string): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  // Course editor sub-routes for instructor/moderator.
  if ((role === "moderator" || role === "instructor") && path.startsWith("/admin/courses/")) {
    return true;
  }
  // Finance sub-routes.
  if (role === "finance" && path.startsWith("/admin/finance")) return true;
  return allowedSetFor(role).has(path);
}

// Sidebar sections each role can see in the left nav.
const ROLE_SECTIONS: Record<Exclude<StaffRole, "admin">, string[]> = {
  moderator: ["Workspace", "LMS", "Engagement"],
  instructor: ["Workspace", "LMS"],
  support: ["Workspace", "Engagement"],
  finance: ["Workspace", "Engagement", "Finance"],
  content_editor: ["Workspace", "Platform"],
};

export function getAccessibleSections(role: AdminRole) {
  if (role === "admin") return null; // null = all sections
  if (!role) return [];
  return ROLE_SECTIONS[role] ?? [];
}
