
## Scope

Seven related fixes across admin, learning UI, notifications, and analytics.

---

### 1. AdminQuizzes: publish/unpublish parity with Assignments

`src/pages/admin/AdminQuizzes.tsx` currently focuses on question authoring. Add a top-level quiz list matching `AdminAssignments`:

- Table of every quiz: title, course, lesson, `is_ai_generated` badge (`✨ AI` vs `Manual`), `is_visible` switch, question count.
- Filters: All / AI-only / Manual-only / Hidden.
- One-click Publish/Unpublish toggles `is_visible` in `quizzes`.
- Keep existing per-quiz question editor accessible from a row action.

### 2. Mobile learning view: Quizzes / Assignments / Related tabs

In `src/pages/CourseLearning.tsx`, the sidebar tabs (Content / Quizzes / Assignments / Related / Q&A / Discussion) only render on desktop/tablet. On mobile, users only see lesson content.

Fix: add a mobile-only tab strip (below the video, above content) that surfaces the same panels using the existing components (`AssignmentPanel`, `LessonQuiz`, related courses list, discussion, Q&A). Use the existing `useIsMobile` hook to toggle rendering — desktop layout untouched.

### 3. Assignment notifications to cohort students

Add a DB trigger on `public.assignments` (AFTER INSERT and AFTER UPDATE of `is_visible`) that fires only when `is_visible = true`:

- Resolve `course_id` via `lessons → modules`.
- Insert one row into `public.notifications` for every enrolled student in that course:
  - title: `New assignment: <title>`
  - link: `/courses/<course_id>/learn?lesson=<lesson_id>&tab=assignments`
  - type: `info`
- Update `CourseLearning.tsx` to read the `tab` query param on mount and auto-select the Assignments tab (also handle `tab=quizzes`).
- Suppress duplicates: only fire on INSERT-when-visible or on UPDATE where `OLD.is_visible = false AND NEW.is_visible = true`.

### 4. Favorites courses

`bookmarks` table + `useBookmarks` + `/bookmarks` page already exist. Gaps to close:

- Surface a "Favorites" (heart) link in the authenticated user menu in `Header.tsx` and in `Dashboard.tsx` quick-links.
- Add a heart toggle button to `CourseCard.tsx` (uses `useBookmarks.toggleBookmark`).
- Rename `/bookmarks` page copy to "Favorites" for consistency with the requested wording; keep the route to avoid breaking links.

### 5. Admin analytics: per-course completion rate

`AdminCourseHealth` already computes completion, but the main `AdminAnalytics` overview doesn't surface it prominently. Add a "Course completion rates" card to `src/pages/admin/AdminAnalytics.tsx`:

- Table per published course: enrolled count, completed count, completion %, avg progress %, sorted by completion %.
- Source: `enrollments` (progress_percentage, is_completed) joined with `courses`.
- Link each row to `/admin/analytics` → Course Health tab for detail.

### 6. Instructor sourcing — replace placeholders with real cohort instructors

Course pages (`CourseDetail`, learning header, `Instructors` list) sometimes show the `instructors` table rows (placeholder profiles) instead of the actual cohort instructor for that course.

Fix:

- Use the existing `get_course_instructors(course_id)` RPC (already in DB) as the source of truth on `CourseDetail.tsx` and `CourseLearning.tsx` header.
- Fall back to `instructors` table only when the RPC returns nothing.
- Verify `Fauziyah Zakariyah` (Fauziyyahzak@gmail.com) is the `cohort_members.role='instructor'` for the Azure bootcamp cohort. If not, insert the correct mapping via migration.

### 7. General bug sweep tied to the above

- Notification click handler: ensure `?tab=…` and `?lesson=…` both survive routing in `CourseLearning`.
- Add missing GRANTs when creating any new trigger functions.
- Verify RLS on `notifications` insert path (trigger runs as SECURITY DEFINER, so unaffected).

---

## Technical Details

**Migration** (single file):

```sql
-- 1. Assignment notification trigger
CREATE OR REPLACE FUNCTION public.notify_assignment_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_course uuid; v_title text;
BEGIN
  IF NEW.is_visible IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.is_visible,false) = true THEN RETURN NEW; END IF;

  SELECT m.course_id INTO v_course
  FROM lessons l JOIN modules m ON m.id = l.module_id
  WHERE l.id = NEW.lesson_id;
  IF v_course IS NULL THEN RETURN NEW; END IF;

  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT e.user_id,
         'New assignment: ' || NEW.title,
         COALESCE(LEFT(NEW.description,160),'A new assignment is available.'),
         'info',
         '/courses/' || v_course || '/learn?lesson=' || NEW.lesson_id || '&tab=assignments'
  FROM enrollments e WHERE e.course_id = v_course;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_assignment_published
  AFTER INSERT OR UPDATE OF is_visible ON assignments
  FOR EACH ROW EXECUTE FUNCTION notify_assignment_published();

-- 2. Verify/insert Fauziyah as Azure bootcamp instructor
-- (verified via read_query in build mode; insert into cohort_members if missing)
```

**Files to touch:**
- `src/pages/admin/AdminQuizzes.tsx` — add list view above editor.
- `src/pages/CourseLearning.tsx` — mobile tabs + `?tab=` param handling.
- `src/components/Header.tsx`, `src/pages/Dashboard.tsx`, `src/components/CourseCard.tsx`, `src/pages/Bookmarks.tsx` — favorites surfacing.
- `src/pages/admin/AdminAnalytics.tsx` — completion rate card.
- `src/pages/CourseDetail.tsx` — instructor RPC sourcing.
- New migration file.

## Order of implementation

1. Migration (trigger + instructor mapping)
2. AdminQuizzes list
3. CourseLearning mobile tabs + tab param
4. Favorites UI (header, card, dashboard)
5. AdminAnalytics completion card
6. Instructor RPC sourcing
