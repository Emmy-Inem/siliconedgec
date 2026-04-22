

## Plan: Admin Polish + Audit & Missing Features

### 1. Fix Create Promo Code & Influencer pages on small screens
The dialog is currently `max-w-lg` and the inner content has many sections (basics, discount, expiration, destination picker, course picker, custom path validation, UTM editor with 4 inputs, live preview block, submit button). On 889×536 (current viewport) the form clips and the submit button can fall below the fold without smooth scroll.

Changes in `src/pages/admin/AdminInfluencerMarketing.tsx`:
- Widen dialog to `sm:max-w-2xl` and add `p-0` so we can split it into a fixed header, scrollable body, and sticky footer with the action button.
- Body becomes `max-h-[75vh] overflow-y-auto px-6 py-4 space-y-4` so every field is reachable.
- Sticky footer (`sticky bottom-0 bg-background border-t px-6 py-3`) holds the **Create Promo Code** button so it never gets hidden.
- Collapse the long form into 3 collapsible sections (Basics / Destination & UTMs / Preview) using `<details>` so small screens see less at once.
- Same treatment for the Detail dialog (`sm:max-w-xl`, scrollable body, sticky close).
- Make grids `grid-cols-1 sm:grid-cols-2/3` so stacked fields don't get squashed below ~480px.
- Stat cards row becomes horizontally scrollable on mobile (`overflow-x-auto -mx-4 px-4`), tables wrap in `overflow-x-auto`.

### 2. Add an Email Extractor to the Leads & Enrollments Hub
Changes in `src/pages/admin/AdminLeadsHub.tsx`:
- New "Extract Emails" button next to **Export CSV** that opens a modal with:
  - Textarea with all unique, comma- and newline-separated emails from the currently filtered list (deduped, lowercased, blanks removed).
  - Counter "X unique emails of Y leads".
  - Buttons: **Copy**, **Download .txt**, **Open in mail client** (`mailto:` BCC string capped at 90 addresses, with auto-chunking notice).
  - Toggle: Include name (`"Name <email>"` format) for cleaner imports.
- Also wire a quick action on each lead row: **Add email to extractor** chip when `email !== "—"`.

### 3. Admin Dashboard Audit — Missing/Weak Features

I scanned the sidebar, routes, and DB schema. Here is what's already present vs. genuinely missing for a complex, comprehensive control panel.

**Already covered well:** Overview, Analytics, Marketing Analytics, Courses + Modules, Categories, Tags, Brands, Reviews, Learning Paths, Students, Enrollments, Webinar Registrations, Business Leads, Leads Hub, Quizzes + Attempts, Q&A, Announcements, Email Blasts, Live Chat, Live Classes, Influencer Marketing, Pricing, Jobs + Applications, Instructors, Testimonials, Site Content, Blog, Pages, Media, Users & Roles, Activity Log, User Activity, SEO, Custom Scripts, Settings.

**Missing or weak for a robust control panel:**

| # | Missing module | Why it matters | What it would deliver |
|---|---|---|---|
| 1 | **Orders & Payments** | `orders` table exists with paystack reference, amount, promo, but there's no admin view | Paid order list, refund flag, revenue by day/month, attach to enrollment |
| 2 | **Certificates Manager** | `certificates` issued automatically — admin can't list/revoke/reissue or bulk verify | Search by code, revoke, regenerate, CSV export |
| 3 | **Bookmarks / Wishlist insights** | Bookmark data is unused for marketing | Top wishlisted courses, abandoned interest list to retarget |
| 4 | **Cart Abandonment** | `cart_items` exists; no recovery flow | List carts > 24h old with course + user, one-click "Send recovery email" |
| 5 | **Lesson Progress / Course Health** | No course-level engagement view | % complete per course, drop-off lesson, average watch progress |
| 6 | **Notifications Composer** | `notifications` table exists, only triggered programmatically | Compose targeted in-app notifications (all / segment / single user) |
| 7 | **Login Attempts / Security** | `login_attempts` table tracks failures but no UI | View failed/locked accounts, IP allow/deny, force password reset |
| 8 | **Lesson Resources Browser** | Resources are managed inside module editor only | Global file browser across courses, storage usage, bulk delete |
| 9 | **Backup & Export Center** | No way to export full DB snapshots or single tables on demand | Per-table CSV/JSON export with filters; scheduled exports |
| 10 | **Roles & Permissions UI** | RBAC exists in code (`admin-permissions.ts`) but route list is hardcoded | UI to grant/revoke per-route access for moderators |
| 11 | **Audit / Admin Activity Filters** | `admin_activity_log` is plain list | Filter by admin, action, entity, date; restore-from-log diff |
| 12 | **Tax & Currency Settings** | Hard-coded NGN and no tax | Editable currencies, FX, VAT rules, invoice prefix |
| 13 | **Referral / Affiliate Payouts** | Commission is calculated, never paid out | Mark referrals "paid", attach payout reference, monthly statement |
| 14 | **Email Templates Library** | Only ad-hoc blasts; no transactional template editor | Edit welcome, enrollment, certificate, password-reset templates |
| 15 | **System Health & Logs** | No place to see edge-function errors or DB linter warnings | Surface edge-function logs, security findings, slow queries |

### 4. Implementation order (this turn covers the first three; the rest stays for follow-up)
Once you approve I will:
1. **Refactor** the Promo Code dialog + detail dialog with sticky footer & scrollable body.
2. **Add** the Email Extractor modal in Leads Hub.
3. **Build the top-priority new admin module: Orders & Payments** (`/admin/orders`) — list with filters by status/date, totals, link to user, refund toggle, CSV export, sidebar entry under "Marketing" → renamed "Commerce" group containing Pricing + Orders + Influencer Marketing.
4. **Add Certificates Manager** (`/admin/certificates`) — search/list/revoke + CSV.
5. **Add Notifications Composer** (`/admin/notifications`) — target all users, single user, or segment (enrolled in course X), persists to `notifications` table.

Items 6–15 from the audit table will be queued as follow-up tasks; tell me which you want next or pick "all".

### Technical notes
- No DB schema changes required for items 1, 2, 6 — all tables exist (`orders`, `certificates`, `notifications`).
- Sidebar will get a new **Commerce** section (Orders, Pricing, Influencer Marketing) and items will be added to `admin-permissions.ts` `ADMIN_ONLY_ROUTES`.
- The mailto: extractor chunks addresses into batches of ≤90 to avoid browser URL limits.
- All new pages use existing patterns (`useQuery` + `Card` + `Table` + `Dialog`) so look & feel stays consistent.

