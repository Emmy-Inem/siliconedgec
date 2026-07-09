## 1. Favorites behavior cleanup

- **Header (**`src/components/Header.tsx`**)** — remove the "Favorites" link from the mobile hamburger menu. Keep the heart icon in the desktop toolbar only.
- **Sort favorites first** — in every place a signed-in user sees a list of courses (`Dashboard.tsx` "My courses", `Courses.tsx` catalog, `Bookmarks.tsx`, `CategoryCourses.tsx`, `RelatedCourses.tsx`), reorder so favorited courses appear at the top while preserving the existing secondary sort. Use the existing `useBookmarks` hook — no schema change.
- Leave the standalone `/bookmarks` page reachable via the desktop heart icon for users who explicitly want the filtered view.

## 2. Admin LMS revamp — one-page, in-place builder

Today, `AdminAssignments` and `AdminQuizzes` push admins back to the curriculum builder to edit, and the curriculum builder itself can only create quiz/assignment *shells* — questions and rubric details live elsewhere. Rebuild so **the course's Curriculum page is the single source of truth** and the top-level Assessments hub is a read-only cross-course index.

### 2a. Curriculum Builder becomes a full assessment editor

File: `src/components/admin/CurriculumBuilder.tsx` (+ new sub-components under `src/components/admin/curriculum/`).

For each lesson row, expand the existing accordion so admins can:

- **Add / edit / delete quiz questions inline** — new `QuizQuestionsEditor` panel that lists all `quiz_questions` for the lesson's quizzes, with add/edit/delete/reorder, option list (multiple choice / true-false / short answer), correct answer, explanation, `order_index`. Uses existing `quiz_questions` table.
- **Multiple quizzes per lesson** — expose a "+ Quiz" button on each lesson; each quiz has editable title, passing score, max attempts, visibility toggle, and its own question list.
- **Multiple assignments per lesson** — inline `AssignmentEditor` with title, instructions (textarea), max points, due date, attachment URL, visibility toggle. No page navigation.
- **AI generation stays opt-in** — keep the existing `✨ AI on/off` per-lesson toggle and the "Generate with AI" buttons inside each editor, writing rows with `is_ai_generated=true, is_visible=false` so nothing appears to students until published.
- Every mutation invalidates `admin-lessons`, `admin-quizzes`, `admin-assignments`, `lesson-ai-exercises` so the other views stay in sync.

### 2b. Assessments hub becomes a read-only index

Files: `src/pages/admin/AdminQuizzes.tsx`, `src/pages/admin/AdminAssignments.tsx`, `src/pages/admin/hubs/AdminAssessmentsHub.tsx`.

- Remove the "Add" buttons and edit navigations. Replace with a **"Open in curriculum" link** on each row that jumps to `/admin/courses/:id/modules#lesson-:lessonId` (anchor auto-scrolls and opens that lesson's accordion in the builder).
- Keep the existing Publish/Unpublish toggle, AI badge, delete, and filters (All / AI / Manual / Hidden) so admins can still do bulk visibility work across courses without leaving the hub.
- `AdminQuizAttempts` and `AdminAssignmentSubmissions` are unchanged.

### 2c. Curriculum page anchor + auto-open

File: `src/pages/admin/AdminCourseModules.tsx` (+ `CurriculumBuilder`).

- When the URL has `#lesson-<id>`, scroll to that lesson row and expand its accordion + assessments panel so "Open in curriculum" from the hub lands the admin exactly where they clicked.

## Corrections & Additions to the Plan

&nbsp;

**1. "No migration required" is incorrect — this needs one.**

`assignments.lesson_id` and `quizzes.lesson_id` currently have **no foreign key constraint at all**. Add:

&nbsp;

```sql

alter table assignments

  add constraint assignments_lesson_id_fkey

  foreign key (lesson_id) references lessons(id)

  on delete restrict;

&nbsp;

alter table quizzes

  add constraint quizzes_lesson_id_fkey

  foreign key (lesson_id) references lessons(id)

  on delete restrict;

```

&nbsp;

(Only add after confirming zero orphaned rows remain — re-run the orphan check first.)

&nbsp;

**2. Audit `CurriculumBuilder`'s save logic before extracting it.**

The current save path for lessons appears to delete-and-reinsert the module's lesson tree rather than diff against existing rows. This is how 7 lessons were previously hard-deleted with their linked assignments silently orphaned (no FK, no audit log). Since this rebuild adds *more* inline delete surfaces (quizzes, assignments, questions), the same destructive-replace pattern must not be carried into the new `QuizEditor` / `AssignmentEditor` / `QuizQuestionsEditor` components. Require: diff against DB state, update matched IDs, insert new, and never bulk-delete unlisted rows without an explicit per-item delete action.

&nbsp;

**3. Define cascade behavior for inline quiz/question deletion.**

Not specified: what happens to `quiz_questions` and `quiz_attempts` when an admin deletes a quiz from the new inline editor. Needs an explicit FK/cascade decision (block if attempts exist, or cascade only to questions, etc.), not left to default behavior.

&nbsp;

**4. "Confirm before shipping" on `quiz_questions` RLS should be an actual query, not an assumption.**

Given the assignments RLS was fine but the underlying data layer wasn't, run the real check:

```sql

select * from pg_policies where tablename = 'quiz_questions';

```

before treating it as verified.

&nbsp;

**5. `order_index` handling needs a stated rule.**

For lessons/quizzes/questions added or reordered inline, the save logic should preserve/assign `order_index` from a diff, not recompute it from array position on every save — recomputing from position is the same bug class (innocent edit silently reshuffles or wipes unrelated rows).

## 3. Bug sweep (scoped to this change)

- Ensure the new inline editors respect the existing `enforce_manual_assignment_visibility` trigger (manual rows keep `is_visible=true`).
- Fix a stale query-key issue: `AdminAssignments`/`AdminQuizzes` currently don't re-fetch after visibility toggles in the curriculum. Standardize invalidations.
- Verify RLS: `quiz_questions` insert/update/delete already require admin/instructor — no policy changes needed. Confirm before shipping.

## Technical notes

- No new tables. Reuses `quizzes`, `quiz_questions`, `assignments`, `lessons`, `modules`, `bookmarks`.
- New files: `src/components/admin/curriculum/QuizEditor.tsx`, `QuizQuestionsEditor.tsx`, `AssignmentEditor.tsx`. Extract from `CurriculumBuilder.tsx` to keep it under ~800 lines.
- No migration required. If a linter warning appears from re-checking policies, it will be handled in the same turn.
- Out of scope: redesigning `AdminCourses`, instructor pages, or the student-facing lesson viewer.

## Build order

1. Header + list sorting for favorites (small, isolated).
2. Extract `QuizEditor` / `AssignmentEditor` / `QuizQuestionsEditor` and wire them into `CurriculumBuilder`.
3. Convert Assessments hub tables to read-only index with deep links.
4. Add `#lesson-:id` anchor handling in `AdminCourseModules`.
5. Verify with the linter and a quick admin walk-through.