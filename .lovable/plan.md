
# Admin & Instructor Fixes — Part 2 (Adapted to Silicon Edge)

This plan adapts your spec to the actual schema and code paths in the app. No new tables invented where existing ones already cover the case, and the immediate reported bugs are fixed first.

---

## 0. Immediate bug fixes (ship first)

### 0a. Manual quiz builder shows no question editor

`AdminQuizzes.tsx` currently only lets you set a "number of stub questions" — the per-question editor (question text + 4 options + correct answer) lives in a separate "Q&A" dialog. Users don't discover it.

Fix in-dialog:
- In the "Manual" tab, after saving the quiz, immediately open the questions editor for that new quiz (`setSelectedQuiz(...); setQuestionsDialogOpen(true)`), instead of closing the dialog.
- Replace the "Number of questions (0–50)" stub input with an inline repeater: an "Add another question" button that pushes `{ question_text, options[4], correct_answer }` blocks; a single "Save quiz" persists the quiz + all questions in one transaction.
- Keep the existing "Q&A" side dialog for later edits.

### 0b. "Not assigned to a cohort yet" while user IS a member

`CohortAccessButton.tsx` finds cohorts by `cohorts.course_id = courseId`, then filters `cohort_members` by those cohort ids. Two failure modes cause the false negative:
1. Cohorts the user is a member of that are NOT linked to `courseId` (e.g. bootcamp cohorts, cross-course cohorts) never show.
2. RLS on `cohort_members` may hide rows for the user even when they are the member row (should be readable — verify policy `user_id = auth.uid()`).

Fix:
- Query `cohort_members` for the current user FIRST (`.eq("user_id", user.id)`), then load those cohort rows and filter to the ones where `course_id = courseId` OR display all if `courseId` isn't set.
- Fall back: if no course-matched cohort but the user has any cohort membership, still surface a smaller "Open your cohorts" link instead of the "Not assigned" empty state.
- Verify the `cohort_members` SELECT policy allows `user_id = auth.uid()`; add it in the migration if missing.

### 0c. Assign Fauziyyah as the true instructor for the Azure bootcamp

Data seed step (via data-insert tool after migrations run):
- Ensure a `user_roles` row with `role='instructor'` exists for the account matching `Fauziyyahzak@gmail.com`.
- Find the cohort where `courses.title` contains "One-Month Cloud Engineering Bootcamp — Microsoft Azure", upsert a `cohort_members` row `(cohort_id, user_id, role='instructor', is_lead=true)`.
- Remove any stale placeholder instructor rows for that cohort.

---

## 1. Centralized RBAC — use the table already in the DB

The project already has `public.role_permissions (role, route, allowed)` and a `role_can_access(role, route)` function, plus `has_role` / `has_any_role`. Do not introduce a parallel `(role, resource, action)` table — extend the existing one so we don't split the source of truth.

Changes:
- Migration: insert `role_permissions` rows for `instructor` covering every `/admin/cohorts*`, `/admin/courses*`, `/admin/quizzes*`, `/admin/assignments*`, `/admin/assessments*`, `/admin/lesson-approvals` route.
- Update `src/lib/admin-permissions.ts` fallback map to match (already partially covers this — align the two).
- Codebase audit: replace every `role === "admin"` gate on cohort/course/assessment surfaces with `has_any_role(['admin','instructor'])` on the server (RLS) and the equivalent `canAccessRoute` / `useAuth().adminRole` check on the client. Grep targets: `role === "admin"`, `isAdmin &&`, `adminRole === 'admin'` inside `src/pages/admin/AdminCohorts*`, `AdminCourses*`, `AdminQuizzes*`, `AdminAssignments*`, `AdminAssessments*`, `AdminLessonApprovals*`, and their child components.
- RLS: all instructor-scoped writes must go through the existing `is_cohort_instructor` / `instructor_teaches_course` / `instructor_teaches_lesson` helpers so instructors stay bounded to their cohorts.

## 2. Instructor Dashboard reshape (this is the current dashboard, not the student one)

Confirmed already in place: `/instructor` layout with cohort selector, Overview, Students, Assignments, Quizzes, Cohort deep-link. Keep as-is; only additions:
- Rename page titles/breadcrumbs from "Dashboard" to "Instructor Dashboard".
- When `adminRole === 'instructor'` and the user hits `/dashboard`, redirect to `/instructor`.
- Header user menu: for instructors show "Instructor Dashboard" instead of "Dashboard".

## 3. Favorites (pin nav items)

Migration:
```
CREATE TABLE public.user_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_key)
);
-- + GRANTs to authenticated/service_role, RLS: user_id = auth.uid() for all ops.
```
UI:
- Add star toggle to items in `AdminSidebar.tsx` and `InstructorLayout.tsx` sidebar, plus the main site header nav for regular users.
- New "Favorites" section rendered above the normal sections, ordered by `order_index ASC, pinned_at ASC`.
- Drag-reorder deferred (record `order_index` on click position for now).

## 4. Manual course access grant (bypass payment)

Reuse existing `enrollments`. Migration adds:
- `access_source text NOT NULL DEFAULT 'payment'` (allowed values: `payment`, `manual_grant`, `promo`, `bootcamp`)
- `granted_by uuid REFERENCES auth.users(id)`

Everywhere the app currently treats `payment_status IN ('paid','success','completed','confirmed')` as "has access" (see `is_paid_enrolled`, `useCourseAccess.ts`, `CohortAccessButton` gating, `CourseAccessGate`), extend to also accept `payment_status = 'granted'` OR `access_source IN ('manual_grant','promo','bootcamp')`. Update the SQL security-definer helpers in the same migration.

UI:
- In `AdminStudents` student detail (and `InstructorStudentDetail`), add "Grant course access" — select course + confirm — upserts enrollment with `access_source='manual_grant', granted_by=auth.uid(), payment_status='granted'`.
- Log to `admin_activity_log`.

## 5. Manual quiz creation permissions (RLS)

Already partially covered by the instructor RLS migration. Add explicit `INSERT`/`UPDATE`/`DELETE` policies on `quizzes` and `quiz_questions` using `instructor_teaches_lesson(lesson_id, auth.uid())`. Verify from the client: instructor creating a quiz on a lesson in their cohort's course succeeds; on another cohort's course fails.

## 6. AI quiz gating (hidden until instructor publishes)

Migration on `quizzes`:
- `is_ai_generated boolean NOT NULL DEFAULT false`
- `is_visible boolean NOT NULL DEFAULT true`

Behavior:
- `AdminQuizzes` AI path sets `is_ai_generated=true, is_visible=false`.
- Manual path keeps `is_visible=true`.
- Student-facing selects (`get_quiz_questions`, `CourseQuizzes.tsx`, `LessonQuiz.tsx`) filter `is_visible=true` OR `has_any_role(auth.uid(), ['admin','instructor','moderator'])`.
- In `AdminQuizzes` list and lesson editor, add a "Publish to students" toggle for AI-generated quizzes.

## 7. Course & lesson search

- Admin: add a debounced (300ms) search input above the tables in `AdminCourses` and lesson list within course editor; query `title ilike %q% OR description ilike %q%` (course) / `title ilike %q%` with course title joined (lessons).
- Student: add a search input on `/courses` catalog and inside `CourseLearning` lesson sidebar.
- No FTS migration in this pass; leave a note to migrate to `to_tsvector` if the catalog exceeds ~500 rows.

## 8. Instructor sourcing — derive from cohort_members

Problem: `courses` still carries denormalized instructor fields (name/avatar) that go stale.

Change:
- Add `is_lead boolean NOT NULL DEFAULT false` to `cohort_members`.
- Create SQL view/function `get_course_instructors(course_id)` returning `(user_id, full_name, avatar_url, is_lead)` by joining `cohorts → cohort_members (role='instructor') → profiles`, ordered lead-first.
- `CourseDetail.tsx`, `Instructors.tsx`, `CourseCard.tsx`: read from this function instead of the denormalized fields.
- Stop writing to the legacy course-level instructor columns from the course editor; leave the columns in place (backfill later) but ignore on read.

---

## Execution order

1. Section 0 fixes (quiz builder UX, cohort detection, seed Fauziyyah).
2. Migration bundle: role_permissions rows for instructor + `user_favorites` + `access_source`/`granted_by` on enrollments + `is_ai_generated`/`is_visible` on quizzes + `is_lead` on cohort_members + `get_course_instructors` function + instructor RLS policies for quizzes/quiz_questions/assignments.
3. Update `admin-permissions.ts`, `useCourseAccess.ts`, `is_paid_enrolled*` callers to honor `granted` / `access_source`.
4. AI-quiz visibility wiring (admin toggle + student filter).
5. Manual grant UI in student detail pages.
6. Favorites UI in sidebars.
7. Course/lesson search inputs.
8. Instructor sourcing swap on course pages.
9. Paystack partial-payment investigation deferred until webhook logs + `bootcamp_payment_events` rows can be inspected (Item 3 of your original spec).

## Technical notes

- All new `public` tables include the required GRANTs to `authenticated` + `service_role` and RLS policies scoped to `auth.uid()`.
- No writes to `auth`, `storage`, `supabase_functions` schemas.
- All instructor-scoped RLS uses the existing `SECURITY DEFINER` helpers (`is_cohort_instructor`, `instructor_teaches_course`, `instructor_teaches_lesson`) — no new helpers needed.
- Data seed for Fauziyyah runs via the data-insert tool after migration approval so it can look up her `auth.users.id` by email.
