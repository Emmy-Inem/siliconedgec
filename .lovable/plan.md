## Instructor Dashboard — tailored to Silicon Edge

The proposed plan largely duplicates infrastructure that already exists. Below is a version rewritten to fit the current schema, RBAC, and routing conventions. Nothing gets rebuilt from scratch — the Instructor Dashboard is a **new role-scoped shell** at `/instructor` that reuses `cohorts`, `cohort_members`, `cohort_posts`, `cohort_sessions`, `quizzes`, `quiz_questions`, `assignments`, `assignment_submissions`, and the existing `has_role('instructor')` policies.

## 1. Role & assignment (reuse what's there)

- `user_roles` already includes `'instructor'` (see `src/lib/admin-permissions.ts`). No enum migration.
- Instructor ↔ cohort scoping already exists via `public.cohort_members.role = 'instructor'`. **Do NOT add `instructor_cohorts`** — it would duplicate this and break existing cohort UI.
- Add one helper: `public.is_cohort_instructor(_cohort_id uuid, _user_id uuid)` (SECURITY DEFINER) returning true when a row exists in `cohort_members` with role `instructor`. Reuse it in RLS instead of `has_role('instructor')` for cohort-scoped tables so an instructor only sees THEIR cohorts, not every cohort.

## 2. Routing & shell

New top-level area, separate from `/dashboard` (student) and `/admin` (staff console):

```text
/instructor                       InstructorLayout (guard: adminRole === 'instructor' OR admin)
  ├─ /                            Overview: needs-action tiles
  ├─ /students                    Roster across my cohorts
  ├─ /students/:userId            Per-student drill-down
  ├─ /cohorts                     Picker (if >1)  → deep link to /cohorts/:id (existing CohortSpace)
  ├─ /quizzes                     List + create (reuses AdminQuizzes engine, cohort-scoped)
  ├─ /quizzes/:id/results         Attempts + per-question breakdown
  ├─ /assignments                 List + create
  └─ /assignments/:id             Submissions + grading side-by-side
```

Routing rules updated in `src/App.tsx` and `AuthContext`:
- When `adminRole === 'instructor'` and user hits `/dashboard`, redirect to `/instructor`.
- Admins can visit `/instructor` too (impersonation-style view).
- Header dropdown: show "Instructor Dashboard" link for instructors instead of "Admin".

`InstructorLayout` provides:
- Cohort selector in the header (persists in `localStorage` — never re-picked per page).
- Sidebar: Overview · Students · Cohort Space · Quizzes · Assignments · Live Sessions.
- Auth guard using `adminRole === 'instructor' || adminRole === 'admin'`.

## 3. Overview — action-first, not stats-first

Tiles fetched from existing tables:
- **Ungraded submissions** — `assignment_submissions` where `grade IS NULL` AND assignment's course is in my cohorts.
- **Unanswered Q&A** — `course_qna` for cohort courses, no `answer` row.
- **Unread cohort posts** — `cohort_posts` count since last visit (per-cohort `last_seen_at` in `localStorage`).
- **Upcoming sessions** — `cohort_sessions` in next 7 days.
- **Pending lesson-unlock approvals** — students who completed the current lesson but have no `lesson_unlocks` row for the next one (uses table shipped last turn).

Each tile links straight to the filtered list — no dead-end numbers.

## 4. Students roster

Single query joining `cohort_members` (my cohorts) → `enrollments` → `profiles`. Columns: name, cohort, course progress %, last active, ungraded count, quiz avg. Filter by cohort, search by name/email. Row click → `/instructor/students/:userId` showing quiz attempts, assignment submissions, lesson progress, cohort activity, and inline approval controls (reuses `LessonApprovalPanel`).

## 5. Cohort Space

No new tables. Instructor `/cohorts` picker deep-links into the existing `/cohorts/:id` `CohortSpace` page. Add an "Instructor tools" strip visible only to staff:
- Pin/unpin any post (already exists in RLS).
- "Announce to cohort" composer that posts with `is_pinned=true` AND triggers `notify_cohort_post` (already wired).
- Bulk-message: send a notification to every `cohort_members` user via `notifications` insert.

## 6. Quizzes

Reuse `quizzes` + `quiz_questions` (already in schema, already used by `AdminQuizzes`). Instructor UI is a thin wrapper:
- List filters by `course_id IN (SELECT course_id FROM cohorts WHERE id IN my_cohorts)`.
- Create modal reuses the manual-count builder shipped last turn (0–50 stubs).
- `/quizzes/:id/results` reads `quiz_attempts` scoped to students in my cohorts and shows: attempts table, distribution, per-question correct %, top wrong answers.

No new tables. Do NOT add `quiz_options` / `quiz_answers` — the project stores options as JSONB in `quiz_questions.options` and answers as JSONB in `quiz_attempts.answers`, graded by the existing `grade_quiz_submission` RPC.

## 7. Assignments

Reuse `assignments` + `assignment_submissions`. New Instructor pages:
- List with status chips (draft / open / past due / all graded).
- Detail view = submissions list on the left, viewer + grade/feedback form on the right (single screen — no tab-switch). Writes `grade`, `feedback`, `graded_by=auth.uid()`, `graded_at=now()`. Existing `notify_assignment_submission` trigger already sends the "graded" notification.

## 8. RLS additions (single migration)

Only what's actually missing. Everything else is already covered.

```sql
-- Helper: cohort membership as instructor
create or replace function public.is_cohort_instructor(_cohort_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.cohort_members
    where cohort_id = _cohort_id and user_id = _user_id and role = 'instructor'
  )
$$;

-- Instructors see submissions from students in their cohorts (course-scoped)
create policy "Instructors read cohort submissions" on public.assignment_submissions
  for select using (
    exists (
      select 1
      from public.assignments a
      join public.lessons l on l.id = a.lesson_id
      join public.modules m on m.id = l.module_id
      join public.cohorts c on c.course_id = m.course_id
      where a.id = assignment_submissions.assignment_id
        and public.is_cohort_instructor(c.id, auth.uid())
    )
  );

-- Same shape for quiz_attempts (read) and lesson_progress (read).
```

Explicitly test: instructor A on cohort X cannot read instructor B's cohort Y data. Add a vitest RLS test alongside `src/test/rls-influencer-referrals.test.ts`.

## 9. Files touched

New:
- `src/pages/instructor/InstructorLayout.tsx`
- `src/pages/instructor/InstructorOverview.tsx`
- `src/pages/instructor/InstructorStudents.tsx`, `InstructorStudentDetail.tsx`
- `src/pages/instructor/InstructorQuizzes.tsx`, `InstructorQuizResults.tsx`
- `src/pages/instructor/InstructorAssignments.tsx`, `InstructorAssignmentGrading.tsx`
- `src/pages/instructor/InstructorCohortPicker.tsx`
- `src/hooks/useInstructorCohorts.ts`
- `src/test/rls-instructor-scoping.test.ts`
- One Supabase migration for `is_cohort_instructor` + scoped read policies.

Edited:
- `src/App.tsx` — add `/instructor/*` routes.
- `src/contexts/AuthContext.tsx` — redirect instructor from `/dashboard` on sign-in.
- `src/components/Header.tsx` — role-aware dashboard link.

## 10. Build order

1. Migration + `is_cohort_instructor` helper + RLS test.
2. `InstructorLayout` + cohort selector + `/instructor` route + redirect logic.
3. Overview tiles (read-only, uses existing data).
4. Students roster + drill-down.
5. Assignments grading (simpler than quizzes).
6. Quizzes list/results (reuse manual builder from last turn).
7. Cohort Space instructor tools strip.

## Technical notes

- No changes to existing student `/dashboard` or admin `/admin/*` — Instructor Dashboard is additive.
- Admins retain access to everything via `/admin`; `/instructor` is a focused workspace, not a replacement.
- No new content tables; all writes go through existing tables so notifications, XP, and analytics keep firing.
