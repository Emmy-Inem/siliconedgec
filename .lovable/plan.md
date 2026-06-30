## Bootcamp Installment Payments — Implementation Plan

A dedicated, reusable Paystack payment link per student for the July 4 – August 1, 2026 bootcamp, with weekly installments, immediate access on enrollment, and automatic access revocation if not fully paid by the end date.

### 1. Database (one migration)

New tables in `public`, with GRANTs + RLS in the same migration:

- `bootcamp_cohorts` — so this isn't hardcoded to one bootcamp.
  - `id`, `slug`, `name`, `start_date`, `end_date`, `default_total_amount`, `default_installments`, `course_id` (FK `courses.id`, nullable — to unlock an existing course on payment), `is_active`.
- `bootcamp_enrollments`
  - `id`, `user_id` (FK `auth.users`, nullable until they sign up), `email`, `full_name`, `reference` (unique), `cohort_id` (FK), `total_amount`, `installment_amount`, `total_installments`, `installments_paid` (default 0), `installment_due_dates date[]`, `next_due_date`, `paystack_page_id`, `paystack_page_slug`, `payment_link`, `access_granted` (default true), `status` (`active|overdue|completed|access_revoked|cancelled`), `last_payment_date`, `created_by` (admin uid), timestamps.
  - Unique `(cohort_id, email)`.
- `bootcamp_payment_events` (idempotency)
  - `id`, `enrollment_id` (FK), `paystack_event_id` (unique), `paystack_reference`, `amount`, `paid_at`, `raw` (jsonb).

RLS:
- Admins/moderators: full read/write on all three.
- Authenticated users: SELECT own row in `bootcamp_enrollments` where `user_id = auth.uid()` OR `lower(email) = lower(auth.jwt()->>'email')`.
- No anon access. `service_role` full access (edge functions).

Trigger: when a user signs up (`handle_new_user`), backfill `bootcamp_enrollments.user_id` by matching email so the existing "generate link before signup" flow links automatically.

Helper RPC `link_bootcamp_enrollment_to_user()` called on first dashboard load as a safety net.

### 2. Edge functions

All three deployed automatically; secret `PAYSTACK_SECRET_KEY` already exists.

- `bootcamp-generate-link` (verify_jwt = true, admin-only check inside)
  - Input: `{ cohort_id, email, full_name, total_amount, installments }`.
  - Verifies caller has `admin` or `moderator` role via `has_role`.
  - Computes installment amount and weekly due dates from cohort `start_date`.
  - Calls Paystack `POST /page` with `amount = installment kobo`, `metadata.reference = <uuid>`, `metadata.cohort_id`, `metadata.email`.
  - Inserts the enrollment row, returns `{ payment_link, enrollment }`.

- `bootcamp-paystack-webhook` (verify_jwt = false)
  - HMAC-SHA512 verification with `PAYSTACK_SECRET_KEY` against `x-paystack-signature` (matches the existing `paystack-webhook` pattern — do NOT just check the header exists like in the source prompt).
  - Only handles `charge.success`.
  - Idempotent insert into `bootcamp_payment_events` on `paystack_event_id`.
  - Matches enrollment via `metadata.reference` OR `paystack_page_id` + customer email fallback (Paystack Page payments don't always echo metadata).
  - Increments `installments_paid`, advances `next_due_date`, marks `completed` when fully paid, sets `last_payment_date`.
  - On completion: if cohort has `course_id`, upsert an `enrollments` row with `payment_status='paid'` so the existing course-access gate unlocks the learning area.
  - Returns 5xx on transient errors so Paystack retries (same convention as existing webhook).

- `bootcamp-check-overdue` (verify_jwt = false, cron-triggered)
  - Marks `active` rows past `next_due_date` as `overdue`.
  - For rows past cohort `end_date` and not `completed`: set `access_granted=false`, `status='access_revoked'`, and (if linked to a course) downgrade the matching `enrollments.payment_status` to `comped_revoked`.
  - Sends an in-app notification (insert into `notifications`) and an email via the existing `send-email` function for overdue + revocation events.

Schedule via `supabase--insert` (not migration, since it contains the project URL/anon key) using `pg_cron` + `pg_net`, daily at 23:00 WAT.

`supabase/config.toml` additions: `verify_jwt = false` blocks for `bootcamp-paystack-webhook` and `bootcamp-check-overdue`.

### 3. Admin UI

New route `/admin/bootcamps` added to the Commerce hub and sidebar (gated by `admin-permissions.ts`):

- **Cohorts tab** — CRUD for `bootcamp_cohorts` (dates, default amount, installments, linked course).
- **Generate Link tab** — form (cohort, email, full name, total amount, installments 2/3/4/6), live preview of installment amount + due dates, calls `bootcamp-generate-link`, shows the link with copy button + "Email to student" action (uses `send-email`).
- **Enrollments tab** — table of all bootcamp enrollments with filters (cohort, status), columns for paid/total, next due date, last payment, access state. Row actions: resend link via email, mark cancelled, manually grant/revoke access, view payment events.

### 4. Student UI

New route `/bootcamp` (or `/bootcamp/:slug` for multiple cohorts):

- Resolves enrollment by `user_id` first, then by email (with the linking RPC).
- Shows cohort name, dates, payment progress bar, next due date, "Pay next installment ₦X" button linking to the stored Paystack page URL.
- Alerts for `overdue`, `completed`, `access_revoked` states.
- If `access_granted` and cohort has a `course_id`, shows a CTA into `/courses/:slug/learn`.
- Empty state for users without an enrollment, with a contact link.

Header/dashboard: small "Bootcamp" entry visible only when the logged-in user has a bootcamp enrollment.

### 5. Public landing

A `/bootcamp/:slug` public page (when not signed in) explaining the bootcamp, installments, and a "Request a payment link" form that creates a `business_leads` row tagged `bootcamp_interest` so admins can follow up and issue a link.

### 6. Verification

- Unit/SQL: confirm GRANTs, RLS denies cross-user reads, unique constraint on `(cohort_id, email)`.
- Webhook: replay a `charge.success` payload via `supabase--curl_edge_functions` with a valid HMAC and confirm idempotency + course unlock.
- Cron: manually invoke `bootcamp-check-overdue` and confirm status transitions.
- Playwright: admin generates a link, student page loads enrollment, overdue banner appears when `next_due_date` is back-dated.

### Technical notes (for the technical reader)

- The original draft's webhook only checks that `x-paystack-signature` exists. We will compute the HMAC SHA-512 of the raw body with `PAYSTACK_SECRET_KEY` and constant-time compare — matching `supabase/functions/paystack-webhook/index.ts` already in the project.
- The original draft stores `payment_link` but no `paystack_page_id`/`slug`; we add both so we can re-resolve, update, or archive the page later.
- Reusing the existing `enrollments` table on completion (rather than a parallel access system) means the existing `useCourseAccess`, lesson gating, certificates, and notifications "just work" once a bootcamp is paid in full.
- Email/notification reuse: `send-email` + `notifications` table already exist; no new infra needed.
- No new secrets required; `PAYSTACK_SECRET_KEY` is already configured.

### Open questions before build

1. Is there a specific existing course in the catalog this bootcamp should unlock on full payment, or is the bootcamp standalone content for now?
2. Should students get immediate access after the FIRST installment, or only once an admin generates the link (your current wording says "immediate on enrollment" — I'll default to: access on link generation, kept until end date unless fully paid)?
3. Late fee or grace period after each weekly due date before flipping to `overdue`?
