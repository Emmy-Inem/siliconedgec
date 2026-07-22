## Part 1 — Cohort numbering (build)

Goal: every course keeps its own Cohort 1, 2, 3… sequence, and every bootcamp keeps its own separate Cohort 1, 2, 3… sequence. Numbers restart per parent, never collide across product types, and enable clean cross-cohort comparisons.

Scope of changes:
- Add a `cohort_number` integer column to `public.cohorts` and to `public.bootcamp_cohorts`.
- On admin cohort creation (manual only — no auto-create), compute the next number as `max(cohort_number) + 1` scoped to the parent (`course_id` for `cohorts`, and the bootcamp scope for `bootcamp_cohorts`). Enforce with a unique index per parent.
- Backfill existing rows: order by `start_date`/`created_at` per parent and assign 1..N.
- Admin cohort forms (`AdminCohorts`, `AdminBootcamps`) display the auto-assigned number as read-only next to the name, and default the name to `"<Course/Bootcamp title> — Cohort N"` (editable).
- Cohort selector and headers everywhere (`InstructorCohort`, `CohortSpace`, admin lists) show the `Cohort N` badge.
- Analytics: add a "Group by cohort number" toggle on the completion-rate and revenue cards so cross-cohort performance is comparable within a course.

Out of scope: renumbering historical archived cohorts, changing existing slugs.

## Part 2 — Admin audit: recommendations & gaps (no build)

High-impact missing or thin features observed across admin pages:

**Cohort & LMS ops**
- No per-cohort dashboard (attendance %, avg quiz score, assignment completion, dropout rate, revenue) — today data is scattered across Students / Analytics / Assessments.
- No cohort lifecycle states (Draft → Enrolling → Active → Completed → Archived) with automatic gating of notifications and access.
- No bulk cohort actions: message all members, export roster CSV, move learners between cohorts, clone a cohort with its curriculum + schedule.
- Live class attendance is captured but never rolled up into a learner's cohort report card.
- No instructor performance view (grading turnaround, class attendance, learner NPS per instructor).

**Learner success**
- No at-risk learner surfacing (no login in N days, missed 2+ assignments, quiz score < threshold) — currently only visible by hand.
- No certificate revocation workflow / audit trail beyond regenerate.
- No unified learner 360 profile (enrollments + orders + refunds + support chats + attendance + XP on one page).

**Commerce & finance**
- Revenue card doesn't segment by cohort, product type, or promo/influencer.
- No refund reasons taxonomy or monthly refund-rate KPI.
- Bootcamp installments: no dunning workflow (auto-reminder emails at T-3, T-0, T+3) and no view of expected vs collected per cohort.
- No coupon/promo performance page beyond click count (conversion %, AOV, LTV per code).
- No tax/VAT export beyond the current basic report — missing per-country breakdown for compliance.

**Marketing & growth**
- Lead → enrollment funnel exists but no cohort-attributed conversion (which cohort a lead ended up in).
- Email announcements have no A/B, no segments beyond "all", no scheduled send, no open/click tracking surfaced in-app.
- No landing-page experiment framework (variant + goal tracking).
- Blog: no editorial calendar, no scheduled publish, no author permissions.

**Content & assessment**
- No question bank reusable across quizzes; each quiz owns its questions.
- No rubric-based grading for assignments (only single grade + feedback).
- No plagiarism / duplicate-submission detection signal.
- No lesson-level analytics (drop-off point in videos, rewatch heatmap).

**Community & support**
- Cohort posts have no moderation queue, no report/flag workflow, no pinned announcements.
- Live chat lacks canned responses, tags, CSAT rating, SLA timers.
- Help center articles have no "was this helpful" analytics feeding back to admin.

**System & security**
- No admin audit-log search UI beyond flat list (filter by admin, entity, date range).
- No 2FA enforcement toggle for staff roles.
- No session revocation UI (force-logout a user).
- No feature-flag panel (currently changes require code deploys).
- No health page for edge functions (last error, p95 latency) beyond webhook events.
- No GDPR request queue (data export / erasure) tracking beyond the raw tools page.

**Mobile admin**
- Several admin tables (Enrollments, Orders, Finance Ledger) overflow horizontally on mobile with no card fallback.
- Sidebar search doesn't include recently visited pages or keyboard shortcut hint (⌘K style).

## Suggested next step

Approve Part 1 to build cohort numbering now. Pick 3–5 items from Part 2 to queue as follow-up builds (my recommendation: per-cohort dashboard, at-risk learners, learner 360, bootcamp dunning, cohort-segmented revenue).
