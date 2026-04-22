

# Site Readiness Audit — What's Missing Before Launch

This is a frank scan of the site, admin, edge functions, and database. Items are grouped by **severity**. Severity 1 must be fixed before user-ready; 2 is strongly recommended; 3 is polish.

## Severity 1 — Blocks launch

| # | Area | Issue | Fix |
|---|---|---|---|
| 1 | **Home page** | Instructors list uses 4 hard-coded cards all named `"Instructor"` with `0` students/courses, causing the React duplicate-key warning in the console. Also a hard-coded testimonials list with 2 generic names. | Pull instructors from the existing `instructors` table (already managed by `AdminInstructors`) and testimonials from a new admin-managed source so you can publish real names, photos, and counts. |
| 2 | **App shell** | `react-helmet-async` is used in `SEO.tsx` but `<HelmetProvider>` is not mounted in `App.tsx` → SEO meta tags are silently dropped. Console also shows a `forwardRef` warning for `Header`/`Dashboard`. | Wrap the app in `<HelmetProvider>`. Convert `Header` to use `React.forwardRef` (or stop passing a ref to it). |
| 3 | **Payments** | Paystack is the only working gateway. Card / Google Pay buttons in `PaymentModal.tsx` are decorative and the Stripe path doesn't exist. Refunds in `AdminOrders` only flip a status — no actual refund call. | Either (a) hide the non-working buttons and add a clear "Paid via Paystack" path only, or (b) wire a Stripe edge function. Add a real `paystack-refund` edge function that calls Paystack's refund API and writes the result back. |
| 4 | **Email delivery** | The `send-email` edge function exists but there is no transactional email actually firing on signup, enrollment, certificate issue, password reset (Supabase default), cart abandonment, or job-application updates. Templates are editable in the admin but never used. | Add database triggers (or call `send-email` from the existing edge functions) that load the matching `tpl_*` template and dispatch on these 6 events. |
| 5 | **Dashboard "My Courses (2)" shows 0** | Session replay shows the count badge says 2 but the body says "No courses yet". The count and the rendered list are reading different sources. | In `Dashboard.tsx` make both the tab badge and the list read from the same filtered `enrollments` array (currently the badge counts everything; the list filters on a state that initialises empty). |
| 6 | **Quizzes / Course Health** | Students cannot actually take a quiz from `CourseLearning.tsx` — the page renders lessons but has no quiz UI. Quizzes exist in admin but have no public surface. | Add a `LessonQuiz` component to the learning page that loads `quizzes` for the current lesson, records a `quiz_attempts` row, and unlocks the next lesson on pass. |
| 7 | **Course Learning resources** | `lesson_resources` table exists with downloads, but the learning page never lists/downloads them. | Render a "Resources" panel under each lesson with signed URLs from the `course-resources` private bucket. |

## Severity 2 — Strongly recommended

| # | Area | Issue | Fix |
|---|---|---|---|
| 8 | **Auth** | No email-verification page, no password-reset *landing* page (the link goes to `/sign-in` and ignores the recovery token), no profile/avatar editor, no "delete my account" option (GDPR). | Add `/auth/callback` and `/auth/reset-password`; add a Profile section in `Dashboard`; add account deletion. |
| 9 | **Cart & checkout** | Cart enforces a single course at checkout (the code goes course-by-course). No support for multi-course Paystack checkout, no order summary page, no invoice/receipt PDF. | Allow one Paystack init per cart total; generate a PDF invoice on success and email it. |
| 10 | **Job board** | Public job pages exist but applicants cannot upload a resume file (the `resume_url` is a free-text input). | Wire a private storage bucket `job-resumes` and a signed-upload widget. |
| 11 | **Live classes** | Times are stored in `scheduled_at` but displayed without timezone, and there's no "Add to Google Calendar" / `.ics` export, no email reminder before class. | Render with the user's locale; add `.ics` download; schedule an email 1h before via a cron edge function. |
| 12 | **Notifications** | Real-time bell exists, but events that should create notifications (new announcement, new course in a wishlisted category, application status change) don't write to the table. | Add insert calls in the matching admin actions and a daily digest email. |
| 13 | **Analytics** | GA4 ID is set but the GTM ID is still the literal placeholder `GTM-XXXXXXX`. | Replace or remove. |
| 14 | **SEO** | No sitemap link in `robots.txt`, no Open Graph image fallback, no JSON-LD `Course` schema. The `generate-sitemap` function exists — wire it. | Reference the sitemap in `robots.txt`, add a default OG image, emit `Course` JSON-LD on `CourseDetail`. |
| 15 | **Mobile** | The admin still has a few tables (`AdminOrders`, `AdminEnrollments`, `AdminCertificates`) that overflow horizontally on phones without `-mx` scroll wrappers; the Header collapses but `cart icon` is hidden behind the menu button on small screens. | Wrap remaining tables in `overflow-x-auto`; surface the cart icon outside the burger. |

## Severity 3 — Polish / nice to have

| # | Area | Item |
|---|---|---|
| 16 | Security UI | Roles editor (currently routes are hard-coded in `admin-permissions.ts`), 2FA for admins, IP allow-list for `/admin`. |
| 17 | Commerce | Tax / VAT settings, multi-currency display, scheduled discounts surfaced on home page banner. |
| 18 | Affiliate | Influencer payout tracker — mark `influencer_referrals` as paid, generate monthly statement PDF. |
| 19 | Backups | One-click "Export full data" CSV/JSON center for compliance. |
| 20 | Performance | Add image `loading="lazy"`, preconnect to `cdn.jsdelivr.net`, code-split admin routes (`React.lazy`) — current bundle loads every admin page upfront. |
| 21 | A11y | Several icon-only buttons miss `aria-label`; the typewriter heading needs `aria-live="polite"`. |
| 22 | Brand | Replace the 4 generic `instructor-1..4.jpg` placeholder portraits with real photos. |
| 23 | Legal | `/p/privacy`, `/p/terms`, `/p/refund-policy` CMS pages need actual content (currently empty drafts) and a footer cookie banner. |

## Implementation order (when you approve)

I'll tackle Severity 1 first in two passes:

**Pass A — quick wins (single turn)**
- Mount `<HelmetProvider>`, fix `forwardRef` warnings, fix duplicate-key Instructor warning.
- Pull instructors on the home page from the `instructors` table.
- Fix Dashboard "My Courses" count vs list mismatch.
- Hide non-working Card / Google Pay buttons; keep only the working Paystack flow.
- Wire `lesson_resources` download list inside `CourseLearning`.

**Pass B — backend wiring**
- New `paystack-refund` edge function + admin "Refund" button.
- Quiz player UI in `CourseLearning` writing to `quiz_attempts`.
- Transactional email triggers using existing `tpl_*` templates (welcome / enrollment / certificate / password-reset / cart-recovery / new-announcement).

Severity 2 and 3 will be queued as separate tasks; tell me which to take next, or "all".

