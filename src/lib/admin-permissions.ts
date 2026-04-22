export type AdminRole = "admin" | "moderator" | null;

const MODERATOR_ROUTES = [
  "/admin",
  "/admin/analytics",
  "/admin/courses",
  "/admin/courses/new",
  "/admin/categories",
  "/admin/tags",
  "/admin/paths",
  "/admin/students",
  "/admin/enrollments",
  "/admin/quizzes",
  "/admin/quiz-attempts",
  "/admin/qna",
  "/admin/announcements",
  "/admin/testimonials",
  "/admin/instructors",
  "/admin/live-classes",
];

const ADMIN_ONLY_ROUTES = [
  "/admin/users",
  "/admin/settings",
  "/admin/marketing",
  "/admin/influencers-marketing",
  "/admin/business-leads",
  "/admin/activity-log",
  "/admin/email",
  "/admin/pricing",
  "/admin/content",
  "/admin/jobs",
  "/admin/job-applications",
  "/admin/chat",
  "/admin/custom-scripts",
  "/admin/registrations",
  "/admin/seo",
  "/admin/user-activity",
  "/admin/media",
  "/admin/leads-hub",
];

export function canAccessRoute(role: AdminRole, path: string): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  // moderator: check if route is in allowed list
  // Handle dynamic routes like /admin/courses/:id/edit
  if (path.startsWith("/admin/courses/")) return true;
  return MODERATOR_ROUTES.includes(path);
}

// Sidebar section labels that moderators can see
const MODERATOR_SECTIONS = [
  "Dashboard",
  "Tutor LMS",
  "Students & Leads",
  "Communication",
  "Content",
];

export function getAccessibleSections(role: AdminRole) {
  if (role === "admin") return null; // null = all sections
  if (role === "moderator") return MODERATOR_SECTIONS;
  return [];
}
