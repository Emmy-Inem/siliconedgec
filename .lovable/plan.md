## What's already done (database)

Two migrations have been applied:

1. Added 4 new roles to the `app_role` enum: `instructor`, `support`, `finance`, `content_editor` (in addition to existing `admin`, `moderator`, `user`).
2. Created `role_permissions(role, route, allowed)` matrix table — admin-managed, readable by all signed-in users; seeded with sensible defaults per role.
3. Created `finance_refunds` and `finance_payouts` tables, restricted to `admin` + `finance` via `has_any_role` helper.
4. Added DB helpers: `has_any_role(uuid, app_role[])`, `role_can_access(role, route)`.

## What this plan builds (code)

### A. Role-Based Access Control overhaul

**`src/lib/admin-permissions.ts`** — rewrite:
- Export `StaffRole` union covering all 6 staff roles, plus `ALL_STAFF_ROLES`, `ROLE_RANK`, `ROLE_LABEL`.
- Replace hardcoded `MODERATOR_ROUTES` allowlist with a hybrid model: hardcoded fallback per role + DB-loaded matrix merged on top via `setRolePermissionsMatrix()`.
- `canAccessRoute(role, path)` consults the merged set; admin bypasses; instructor/moderator keep dynamic `/admin/courses/:id/*` access.
- `getAccessibleSections(role)` returns the sidebar sections each role can see (e.g. finance → Workspace + Finance + Engagement).

**`src/hooks/useRolePermissions.ts`** (new) — loads the matrix via React Query and calls `setRolePermissionsMatrix()` on success so `canAccessRoute` is reactive.

**`src/contexts/AuthContext.tsx`** — replace the two-step `admin`/`moderator` probe with a single query against `user_roles` for the current user; pick the highest-ranked role via `ROLE_RANK` and keep `isAdmin` true for any staff role (so existing `RequireAdmin` gates still allow staff into `/admin`).

**`src/pages/admin/AdminLayout.tsx`** — call `useRolePermissions()` at mount so the matrix is in place before the route guard runs.

**`src/components/admin/AdminSidebar.tsx`** — add a `Finance` section with `Finance Hub` link, filter sections by `getAccessibleSections`, also call `useRolePermissions()`.

**`src/pages/admin/AdminUsers.tsx`** — replace the 3-button role selector with a `<Select>` listing all 6 staff roles + `user`; update the role badge map and column rendering accordingly; show a small description for each role.

### B. Permission Matrix UI

**`src/pages/admin/AdminPermissions.tsx`** (new):
- Table layout: rows = routes (grouped: Workspace, LMS, Engagement, Commerce, Finance, Content, System), columns = the 5 non-admin staff roles.
- Each cell is a `<Switch>` bound to a row in `role_permissions`.
- Bulk toggle "Allow all in section" per row group.
- "Reset to defaults" button re-seeds the recommended set.
- All mutations gated by RLS (admin only).

Wired as a new tab in `AdminSystemHub` ("Permissions") so admins reach it via `/admin/system?tab=permissions`.

### C. Finance Hub

**`src/pages/admin/AdminFinanceLedger.tsx`** (new) — Revenue ledger built from `orders`:
- KPIs: gross revenue, net revenue (gross − refunds), VAT collected (configurable rate from `site_settings`, default 7.5% NG VAT shown as estimate), commission paid, refunds total.
- Monthly revenue + refunds bar chart (12 months).
- Top 10 courses by net revenue.
- CSV export.

**`src/pages/admin/AdminRefunds.tsx`** (new) — `AdminCrudTable` over `finance_refunds`:
- Columns: order ref, customer, amount, status, reason, processed by, date.
- Create/edit dialog with order picker (search recent orders), amount, reason, status.
- "Mark processed" quick action stamps `processed_at` + `processed_by`.

**`src/pages/admin/AdminPayouts.tsx`** (new) — `AdminCrudTable` over `finance_payouts`:
- Columns: payee, type (instructor/influencer/vendor), period, amount, method, status, reference.
- Create/edit dialog with payee picker (instructors + influencer promo codes).
- Bulk export to CSV.

**`src/pages/admin/AdminTaxReport.tsx`** (new) — Tax breakdown by month:
- Reads paid orders for the selected year.
- Shows gross, taxable base, tax (rate configurable), exempt totals.
- Per-month table + annual summary, CSV export.

**`src/pages/admin/hubs/AdminFinanceHub.tsx`** (new) — `HubShell` with tabs:
1. Ledger
2. Refunds
3. Payouts
4. Tax Report

### D. Wiring (`src/App.tsx`)

- Lazy-import `AdminFinanceHub` and `AdminPermissions`.
- Add `<Route path="finance" element={<AdminFinanceHub />} />` under `/admin`.
- Add legacy redirects `/admin/refunds`, `/admin/payouts`, `/admin/tax`, `/admin/permissions` → finance/system tabs.

### E. Public count accuracy fixes

**`src/pages/Index.tsx`** — drop the `Math.max(..., 2000)` floor; show real student/course/instructor counts. If a count is 0, hide that stat tile entirely (don't fake "Students worldwide: 0+"). Keep admin override path (`home?.stat_students`) so the team can still set a hero number explicitly.

**`src/components/CourseCard.tsx`** — only render the `Users` enrolled badge when `students_enrolled >= 5`; otherwise hide.

**`src/pages/CourseDetail.tsx`** — same threshold for the "X Enrolled" line; hide instead of showing "0 Enrolled".

**`src/pages/CourseDetail.tsx`** (JSON-LD) — keep `ratingCount` truthful: only emit `aggregateRating` JSON-LD when there is a real review count (not faked from enrolled).

### F. Admin Activity Log entries

Every role change, permission-matrix change, refund status change, and payout status change writes to `admin_activity_log` via `logAdminActivity()`.

## Out of scope (deliberately)

- Marketing Analytics file (`AdminMarketingAnalytics.tsx`) is already careful and channel-attribution-aware — no changes.
- Existing courses' cached `students_enrolled` column stays as-is; the sync trigger already maintains it. We just stop showing it when it's 0.

## Risks / notes

- Adding enum values then using them in the same migration is illegal in Postgres — handled by splitting into two migrations (already done).
- `RequireAdmin.isAdmin` currently means "admin or moderator". After the AuthContext change it will mean "any staff role", so the new roles can reach `/admin`. The route-level `canAccessRoute` guard inside `AdminLayout` then narrows what each role sees.
- The matrix is permissive-merge with hardcoded fallback so a corrupted/empty matrix never locks staff out of their baseline routes.
