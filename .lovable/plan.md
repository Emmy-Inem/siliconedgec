
# Consolidated Remaining Work

Below is a single plan covering every unresolved item from the recent threads. Each item names the exact area of the app that changes so nothing gets lost.

## 1. Mobile admin sidebar refuses to close on real devices
- Rebuild the mobile drawer close path in `src/components/admin/AdminSidebar.tsx`:
  - Replace the capture-phase `pointerdown` listener with a dedicated fullscreen overlay `<button>` that handles `onClick` (works reliably on iOS Safari where `pointerdown` bubbling is inconsistent).
  - X button uses `onClick` only (drop the `onPointerDown` setter that competes with React's synthetic click on touch).
  - Remove `onPointerDown={stopPropagation}` on `motion.aside` — it swallows the click on some touch stacks.
  - Add `onClick` on every `<Link>` inside the drawer to force-close (already partially present via `onNavigate`, but audit every branch including Pinned links).
- Do the same audit on the public site `Header.tsx` mobile menu.

## 2. LMS admin sync issues
- **Assessments → Assignments tab**: now loads (FK restored). Add a "Type" filter (Manual / AI / All) and a visibility filter so instructors can find their manual work fast.
- **Quizzes ↔ Lessons sync**: In `AdminQuizzes.tsx`, add the same lesson-attach + course-column display parity as Assignments. Add bulk Publish/Unpublish.
- **LMS Sync Health panel** (`src/pages/admin/AdminLmsSyncHealth.tsx`, wired into System hub): shows per-user rows for a course with columns: paid-enrolled, cohort member, lesson-progress rows, assignment submissions. Flags mismatches (e.g. enrolled but not in cohort, cohort member but no enrollment).
- **Curriculum builder** (`CurriculumBuilder.tsx`): confirm every assignment/quiz insert path writes both `is_ai_generated` and `is_visible` explicitly; add a small "unsaved changes" indicator.

## 3. Notification system reliability
- Verify DB triggers `notify_assignment_published` and `notify_quiz_published` are still attached after recent migrations (audit and re-create if missing).
- Add triggers for: enrollment granted, cohort access granted, submission graded — each inserting into `notifications` with a deep link.
- Ensure `NewAssessmentToast` subscribes to `notifications` realtime channel for the current user and shows a toast with a "Go to assignment/quiz" CTA.
- Add a per-user delivery log (reuse `notifications.read_at`) surfaced in the Sync Health panel above so we can confirm delivery.

## 4. Favorites
- Confirm the heart on `CourseCard` writes to `user_favorites`.
- Ensure `Dashboard.tsx` sorts favorited courses to the top (already implemented) — verify after query invalidation on favorite toggle.
- Remove any lingering "Favorites" links from mobile hamburger (already done — audit `Header.tsx` once more).

## 5. Revenue figure
- `AdminAnalytics.tsx` — recompute from `orders` where `status IN ('paid','completed')` summing `amount_paid`. Add a small breakdown card (Paystack vs Stripe vs manual grant → excluded).
- Show a warning banner if any `enrollments.payment_status = 'granted'` rows exist so admin knows they aren't counted as revenue.

## 6. Cohort/course access consistency
- Confirm the `auto_join_course_cohort` trigger still fires for the Azure bootcamp and back-fill any paid enrollees who aren't in `cohort_members`.
- Add a nightly reconciliation view `v_cohort_access_health` used by the Sync Health panel.

## 7. Instructor sync (Fauziyah Zakariyah)
- Global sweep across `CourseDetail.tsx`, `CourseLearning.tsx`, `Cohorts.tsx`, `CohortSpace.tsx`, and any hard-coded "Tayo" references — replace with real cohort instructor via `get_course_instructors` RPC.
- Confirm her `instructors` row uses the uploaded hijab portrait everywhere (fallback avatars replaced).

## 8. New admin categories worth adding
Proposed additions to the sidebar (pending your approval before build):
- **Learner Success**: consolidates completion rate, at-risk students, cohort attendance.
- **Content Moderation**: reviews queue, reported comments, flagged submissions.
- **Integrations**: Paystack/Stripe/Google Calendar/Email domain status in one place.
- **Audit & Compliance**: activity log, login security, GDPR tools, blocked IPs.
- **Automations**: notification rules, drip emails, cohort auto-join settings.

## Technical Details
- FK `assignments_lesson_id_fkey` was just added; PostgREST schema cache reloaded.
- All new tables (Sync Health uses views, not new tables) will follow GRANT + RLS pattern.
- No changes to `client.ts`, `types.ts`, or `.env`.
- Playwright verification for mobile close will run against iOS-emulating user-agent (`WebKit`) in addition to Chromium mobile emulation.

## Order of Execution
1. Mobile sidebar close (blocks admin usability).
2. Notifications + triggers audit.
3. LMS Sync Health panel + Assignments filters.
4. Revenue recompute.
5. Cohort/enrollment reconciliation + instructor sweep.
6. New sidebar categories (after your pick from item 8).

Reply "approve" to start, or tell me which of the new admin categories in item 8 to include/skip.
