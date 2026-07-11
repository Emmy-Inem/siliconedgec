## Fix critical LMS + access-grant issues

### 1. "Couldn't grant access" error
Root cause: `enrollments_payment_status_check` allows only `pending/paid/refunded/free/comped/confirmed/success` — but `AdminAccessGrants.tsx` inserts `payment_status='granted'`. Every manual grant fails with the check-constraint error shown in the screenshot.

Fix (migration): drop and recreate the check constraint to include `'granted'`.

### 2. Grant Oluwaseun Adegbesan (seunmii@gmail.com, user_id `07f6ed4c-…`) access to the Azure Bootcamp
Because the course is `cohort_only=true`, an enrollment row alone won't unlock it — cohort membership is required. Add him to both:
- `enrollments` (course `3b1f29ec-…`, `payment_status='granted'`, `access_source='manual_grant'`)
- `cohort_members` (cohort `269e0f74-…` "Azure Bootcamp — Cohort 1")

### 3. Student count showing 253 instead of the real cohort size
`courses.students_enrolled = 253` for the Azure course, but `cohort_members = 1`. For `cohort_only` courses, the displayed count should reflect cohort membership, not the legacy 253 stray enrollments that pre-date the cohort gate.

Fix:
- Backfill `courses.students_enrolled` for cohort-only courses to `count(cohort_members)`.
- Update the DB trigger / RPC that maintains `students_enrolled` so cohort-only courses count cohort members; other courses continue counting paid enrollments.

### 4. Assignment / quiz notifications only reaching real students
Current triggers `notify_assignment_published` and `notify_quiz_published` fan out to every row in `enrollments` for the course. For the Azure bootcamp that's 253 people who can't even open the course. 

Fix: rewrite both trigger functions so that when the course is `cohort_only`, notifications insert one row per `cohort_members.user_id` for cohorts tied to that course; otherwise keep the current enrollments-based fan-out. Same link format (`/courses/:id/learn?lesson=…&tab=…`) so the bell deep-links straight to the item.

### 5. "New assignment / quiz" pop-up for cohort students
Add a lightweight in-app modal (`NewAssessmentToast`) mounted in `App.tsx` that:
- Subscribes to realtime inserts on `notifications` for the current user where `type='info'` and `link` contains `tab=assignments` or `tab=quizzes`.
- Shows a dismissible modal with title + "Open assignment / quiz" CTA that navigates to the notification's `link`.
- Marks the notification as read on click / dismiss.

No new tables — reuses existing `notifications` rows so the bell and the pop-up stay in sync.

### 6. Global LMS flow verification
- `CourseAssignments.tsx` / `CourseQuizzes.tsx` / `LessonQuiz.tsx` already gate on `useCourseAccess`; confirm cohort members pass (they do — hook already checks `cohort_members`).
- Confirm assignment/quiz submission RPCs (`is_paid_enrolled_for_assignment`, `is_paid_enrolled_for_lesson`) already honour cohort access (they were updated in the previous migration). Re-run linter after the migration.

### Technical details

**Migration (single file):**
```sql
-- 1. widen check constraint
ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_payment_status_check;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_payment_status_check
  CHECK (payment_status IN ('pending','paid','refunded','free','comped','confirmed','success','granted'));

-- 2. seed access for Seun
INSERT INTO public.enrollments (user_id, course_id, payment_status, access_source, granted_by)
VALUES ('07f6ed4c-8a5b-452f-95ae-2f970bbfdcc0','3b1f29ec-8fd4-4ff0-9357-1987b90e6c91','granted','manual_grant', null)
ON CONFLICT (user_id, course_id) DO UPDATE SET payment_status='granted', access_source='manual_grant';

INSERT INTO public.cohort_members (cohort_id, user_id, role)
VALUES ('269e0f74-781a-4224-a10c-ea666cf47d9a','07f6ed4c-8a5b-452f-95ae-2f970bbfdcc0','student')
ON CONFLICT DO NOTHING;

-- 3. rewrite the two notification trigger functions to branch on cohort_only
--    (SELECT cohort_only FROM courses WHERE id = v_course) → fan out to cohort_members OR enrollments

-- 4. recompute students_enrolled for cohort_only courses
UPDATE public.courses c SET students_enrolled = (
  SELECT count(DISTINCT m.user_id)
  FROM public.cohort_members m
  JOIN public.cohorts co ON co.id = m.cohort_id
  WHERE co.course_id = c.id
) WHERE c.cohort_only = true;

-- 5. update the recount trigger/function used elsewhere to branch on cohort_only
```

**Frontend:**
- `src/components/NewAssessmentToast.tsx` (new): realtime listener + modal.
- `src/App.tsx`: mount `<NewAssessmentToast />` inside the auth-aware tree.

No changes to `AdminAccessGrants.tsx` are needed once the constraint is widened.
