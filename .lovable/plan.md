# Global audit — bugs, gaps, and fixes

Scope: static scan of `src/`, DB functions/triggers/policies, Supabase linter (74 warnings), and the persisted security scanner (3 findings). Below is what's actually broken, incomplete, out of sync, or insecure — grouped by area — followed by a sequenced fix pass.

## 1. Bugs & broken behavior

- **Mobile sidebar close is still flaky.** `AdminSidebar` and public `Header` both close the drawer only on `location.pathname` change, so subsection navigations that only change `?tab=` leave the panel open. Verified in code. Same class of bug on `Header` mobile menu.
- **Assignment lesson viewer duplication regression risk.** `CourseLearning` filters `content_type === 'assignment'` from the main list; need to re-verify no lesson is now unreachable.
- **Revenue banner:** `AdminAnalytics` sums `orders` but does not exclude refunded rows; refunds table exists (`finance_refunds`) but isn't netted out.
- **`students_enrolled` drift:** trigger recomputes on cohort inserts, but manual grants (`payment_status='granted'`) sometimes bypass cohort insert on non-cohort courses. Count can drift high again.
- **Notifications popup (`NewAssessmentToast`)** only inspects `title`/`link` regex — a notification created by future triggers with different copy silently drops. Should key off a stable `type` value.
- **`InfluencerSignupPrompt` / OAuth redirect race** (`AuthContext`) relies on a 50 ms timeout — flaky on slow networks.
- **`getResumeLesson` in `lesson-progress.ts` returns the last unlocked lesson, not first incomplete** — mislabels resume when the middle is done.
- Persistent Meta Pixel warnings in console (`fbq('set','userData',…) invalid pixel_id`) — quoting bug in `CustomScripts.tsx` passes IDs as string literals inside quotes.

## 2. Incomplete / half-wired features

- **Instructor dashboard**: layout, pages and hooks exist (`src/pages/instructor/*`) but there is no admin UI to assign instructor role, no grading email notification, no "return for revision" flow.
- **LMS Sync Health panel** exists but only reads live data — no `v_cohort_access_health` view and no reconcile/backfill action button.
- **Assignments filter** exists on `AdminAssignments` but bulk publish/unpublish is not wired.
- **`AdminQuizzes`** still lacks bulk publish/unpublish parity with Assignments.
- **Manual course access grant UI** (`AdminAccessGrants`) doesn't record `admin_activity_log`, so grants are not auditable.
- **Certificates**: `issue_certificate_on_completion` fires, but there's no "regenerate certificate" admin action when a name is corrected.
- **Notifications**: no delivery log surfaced; `NotificationBell` unread counter isn't cleared when a toast is opened via `NewAssessmentToast`.
- **Search**: `AdminSearch` component exists but doesn't index lessons/assignments/quizzes — only top-level entities.
- **Favorites**: heart writes to `user_favorites` and Dashboard sorts favs first — confirmed. `CategoryCourses` and `Search` results pages do NOT show the heart yet.
- **Cohort auto-join** trigger exists but no back-fill migration for historical paid enrollees on non-cohort-only courses that later became cohort-only.
- **Instructor sweep**: `CourseDetail` uses `get_course_instructors` RPC, but `Instructors.tsx` list page and `CohortSpace` header still reference hard-coded strings in a couple of branches.
- **Empty states**: several admin pages (`AdminQuizAttempts`, `AdminWebhookEvents`, `AdminBackupStatus`) render blank when no rows — no "no data" component.

## 3. Sync issues

- **Enrollment ↔ cohort ↔ students_enrolled**: three sources of truth, reconciled by triggers that assume happy-path payments. Manual grants and refunds don't reverse cohort membership or decrement counters.
- **Assignments ↔ lessons**: FK was recently restored; some AI-generated rows still lack `is_visible=false` per current default because they were inserted before the trigger.
- **Quiz visibility**: `reveal_ai_quiz_for_lesson` flips `is_visible=true` per lesson but there's no per-user unlock; once revealed, it's revealed for everyone. That contradicts the "student generates their own quiz" intent.
- **Instructor role** in `user_roles` vs cohort_members `role='instructor'` — two independent role stores; `has_role` and `is_cohort_instructor` can disagree.
- **Notifications realtime**: `NewAssessmentToast` subscribes on user id but `UserNotificationBell` refetches on interval — should share a single subscription.
- **Sitemap & SEO**: `generate-sitemap` edge function isn't scheduled; sitemap.xml in `public/` is stale.

## 4. Security (Supabase linter + scanner)

Persisted findings (3 warns):
- `ai_quiz_attempts` INSERT allows arbitrary `lesson_id`/`course_id` — add enrollment WITH CHECK.
- `chat_messages.sender_role` can be spoofed to `'admin'` — constrain to `'user'` for non-staff.
- `quiz_attempts` INSERT lacks enrollment check.

Linter (74 warns):
- 1× extension in `public` schema.
- ~32× `SECURITY DEFINER` functions granted to `anon`.
- ~40× `SECURITY DEFINER` functions granted to `authenticated`.

Action: revoke `EXECUTE ... FROM anon` on every function that doesn't need to run pre-login (keep `resolve_promo_slug`, `validate_promo_code`, `verify_certificate`, `get_public_profiles` public; revoke the rest from `anon`). Revoke from `authenticated` on functions only used by internal triggers (e.g. `handle_new_user`, all `notify_*`, all `award_*`, all `sync_*`, `enforce_*`, `protect_*`, `set_course_slug`, `link_bootcamp_enrollment_on_signup`, `auto_join_course_cohort`, `auto_enroll_on_registration`, `auto_record_influencer_referral*`, `recompute_enrollment_progress`, `update_updated_at_column`, `issue_certificate_on_completion`, `touch_enrollment_last_lesson`, `update_chat_on_message`, `sync_jobs_applications_count`, `sync_students_enrolled`, `sync_cohort_only_students_enrolled`, `sync_promo_usage_count`, `notify_*`, `enforce_lesson_unlock_order`). Move `pg_trgm`/other extensions out of `public`.

## 5. Fix pass (single sequenced batch, one build cycle)

1. **Security migration** — single migration that:
   - Revokes `EXECUTE` from `anon` on non-public RPCs; revokes from `authenticated` on trigger-only functions.
   - Moves extensions from `public` to `extensions` schema.
   - Adds `WITH CHECK` enrollment gate on `quiz_attempts` and `ai_quiz_attempts` INSERT policies.
   - Adds `WITH CHECK (sender_role = 'user' OR has_any_role(auth.uid(), ARRAY['admin','moderator','support']))` on `chat_messages`.
   - Adds `v_cohort_access_health` view + `reconcile_cohort_access(course_id)` function for Sync Health.
   - Adds `admin_activity_log` writes to `AdminAccessGrants` grants via SECURITY DEFINER helper.
2. **Mobile drawer** — port the `AdminSidebar` "close on any location change (pathname + search)" fix into `Header`, and add a `useEffect` that closes when `location.search` changes too.
3. **Revenue** — net `finance_refunds.amount_refunded` from the total in `AdminAnalytics`; add refund breakdown card.
4. **Notification pipeline** — add stable `notifications.type` values (`assignment_published`, `quiz_published`, `assignment_graded`, `enrollment_granted`); update `NewAssessmentToast` to key off `type`; add "Return for revision" action on grading; single realtime channel shared with `UserNotificationBell`.
5. **Quiz self-service** — replace `reveal_ai_quiz_for_lesson` with a per-user `ai_quiz_reveals(user_id, lesson_id)` table so revealing one user's practice quiz doesn't unhide it for the cohort.
6. **AdminQuizzes bulk actions + AdminAssignments bulk publish/unpublish**.
7. **Search index** — extend `AdminSearch` to include lessons, quizzes, assignments (single RPC returning typed rows).
8. **Empty-state component** shared across admin tables.
9. **Instructor sweep** — replace any remaining hard-coded instructor strings with the `get_course_instructors` RPC (audit `Instructors.tsx`, `CohortSpace.tsx`, `Bootcamp.tsx`).
10. **Meta Pixel** — fix the double-quoting in `CustomScripts.tsx` so IDs aren't emitted as `"'123'"`.
11. **Sitemap** — schedule `generate-sitemap` daily via cron entry in `supabase/config.toml`.
12. **Post-fix verification** — Playwright pass covering: mobile drawer close on tab change, revenue card, quiz self-reveal isolation, chat sender_role spoof attempt (should 403), and admin sidebar navigation across roles.

## Technical Details

- All migrations follow CREATE → GRANT → RLS → POLICY order for any new tables (`ai_quiz_reveals`, `v_cohort_access_health` is a view — grants only).
- No changes to `client.ts`, `types.ts`, `.env`.
- No changes to `auth`/`storage`/`realtime` schemas.
- Meta Pixel fix is a string-templating change in `CustomScripts.tsx` — no data changes.
- Sitemap cron entry goes in `supabase/config.toml` (allowed) — no dashboard steps.

Reply "approve" to run the fix pass in this order, or tell me which items to drop / re-prioritize.
