
## 1. Instructor role — expanded permissions

The `instructor` role already exists in `src/lib/admin-permissions.ts`. Extend it so instructors can fully manage cohorts + courses (not just view).

- Add these routes to `FALLBACK_ALLOWED.instructor`: `/admin/cohorts`, `/admin/courses/new`, `/admin/categories`, `/admin/tags`, `/admin/paths`, `/admin/enrollments`, `/admin/certificates`, `/admin/live-classes`, `/admin/instructors`, `/admin/course-modules`.
- Add "Engagement" to `ROLE_SECTIONS.instructor` so the sidebar exposes Cohorts + Communication.
- Update `has_any_role` policy checks on DB tables that currently gate on `admin`/`moderator` for cohort + course editing (cohorts, cohort_members, cohort_sessions, cohort_materials, cohort_posts pin/delete, modules, lessons, courses, assignments, quizzes) to also include `'instructor'::app_role`.
- Seed default rows in `role_permissions` so the RBAC matrix UI at `/admin/system` reflects the new instructor grants (admin can still edit).

## 2. Manual quizzes & assignments (no AI)

Admin + instructor should be able to hand-author quizzes/assignments and pick exactly how many items to attach per lesson.

- In `AdminQuizzes` / `AdminAssessmentsHub`: add a "Create manually" flow with `Number of questions` field; render N question forms (question text, options, correct answer, explanation). Keep the existing AI generator, but make it opt-in via a toggle — default is manual.
- Same treatment for `AdminAssignmentSubmissions` hub: add a "New assignment" dialog (title, description, lesson, points, due date, `count` for multi-part assignments).
- Both flows write directly to `quizzes`/`quiz_questions` and `assignments`. Guard the UI + RLS with `has_any_role(auth.uid(), ARRAY['admin','instructor'])`.

## 3. Lesson-unlock approval by instructor/admin

Replace "auto-unlock when previous lesson complete" with "unlock only after an admin/instructor approves it for that learner".

- New table `public.lesson_unlocks (user_id, lesson_id, approved_by, approved_at, note)` with unique `(user_id, lesson_id)`; RLS: learner can `SELECT` their rows; admin/instructor can `INSERT/UPDATE/DELETE`.
- Rewrite `enforce_lesson_unlock_order` trigger so a learner can only mark a lesson complete when either (a) it's the first lesson, or (b) an approval row exists.
- Update client helper `src/lib/lesson-progress.ts` `isLessonUnlocked` to also require an approval for lessons after the first (via new `approvals: Set<string>` field in `UnlockContext`).
- In `CourseLearning.tsx`, load approvals for the current user, gate the lesson list padlocks accordingly, and add an inline "Approve next lesson for this student" control rendered only when `isAdmin || adminRole === 'instructor'`. Hidden entirely for regular students. Provide a bulk "Approve all remaining" for admins.
- Add `/admin/course-progress` (accessible to admin + instructor) to review per-student progress and toggle approvals.

## 4. Cohort Space — mobile/desktop polish

Fix header cutoff and general layout on `src/pages/CohortSpace.tsx`.

- Hero: replace `min-h-[16rem] md:h-80` with a fluid `py-10 md:py-16` container so title/description never overflow; add `pt-20` to clear the fixed site header; ensure `<h1>` uses `text-2xl sm:text-3xl md:text-5xl leading-tight` and description clamps to 3 lines on mobile.
- Move breadcrumb ("My cohorts") above the badges with proper spacing; wrap status/date row so it stacks under 380px.
- Tabs: replace `grid-cols-2 sm:flex` with a horizontally scrollable pill row on mobile (`overflow-x-auto no-scrollbar`); labels stay one line.
- Stat strip: switch to `grid-cols-1 xs:grid-cols-3` for very narrow screens; ensure numbers don't crop.

## 5. Discussion — chat-style redesign

Match the polished look of the homepage cohort animation.

- Rework `Discussion` in `CohortSpace.tsx`:
  - Two-tone bubbles: own posts right-aligned in `bg-primary text-primary-foreground`, others left-aligned in `bg-muted text-foreground`, both `rounded-2xl` with a small tail.
  - Avatar always on the sender side; name + timestamp in a small caption above the bubble.
  - Reply-to shows a quoted preview inside the reply bubble (author name + first ~80 chars, clickable to scroll to original).
  - Actions row (Reply / Pin / Delete) appears on hover / long-press.
  - Compact composer pinned to the bottom of the tab (sticky), with an inline "Replying to @name ×" chip when `replyTo` is set.
  - Reactions row (👍 ❤️ 🎉) — thin `cohort_post_reactions` table (user_id, post_id, emoji). Optional but included.
  - Auto-scroll to newest, keep pinned posts as a dismissible strip at the top.
- Add subtle divider between conversation days ("Today", "Yesterday", full date).

## Technical notes

- Migration steps required: `lesson_unlocks` table + trigger rewrite, `cohort_post_reactions` table, role_permissions seed for instructor, RLS updates on cohort_*/quizzes/assignments/modules/lessons to include instructor.
- No breaking data changes — existing completions stay valid; unlock approvals only gate lessons the student hasn't reached yet.
- Files touched (est.): `src/lib/admin-permissions.ts`, `src/lib/lesson-progress.ts` + tests, `src/pages/CohortSpace.tsx`, `src/pages/CourseLearning.tsx`, `src/pages/admin/AdminQuizzes.tsx`, `src/pages/admin/AdminAssignmentSubmissions.tsx`, new `src/pages/admin/AdminCourseProgress.tsx`, `src/App.tsx` route, plus one Supabase migration.
