

## Plan: Add Tutor LMS-style Features to Admin Panel

Based on the uploaded screenshot showing a WordPress Tutor LMS admin panel, here's what needs to be added to match that level of LMS functionality.

### New Database Tables (via migrations)

1. **`categories`** -- course categories (name, slug, description, order_index)
2. **`tags`** -- course tags (name, slug)
3. **`course_tags`** -- join table (course_id, tag_id)
4. **`learning_paths`** -- learning paths/tracks (title, description, order_index, is_published)
5. **`learning_path_courses`** -- join table (path_id, course_id, order_index)
6. **`quizzes`** -- quizzes tied to lessons (lesson_id, title, passing_score)
7. **`quiz_questions`** -- questions for quizzes (quiz_id, question_text, options as jsonb, correct_answer, order_index)
8. **`quiz_attempts`** -- student quiz attempts (user_id, quiz_id, score, answers as jsonb, completed_at)
9. **`course_qna`** -- Q&A discussion per course/lesson (course_id, lesson_id, user_id, question, parent_id for replies)
10. **`course_announcements`** -- per-course announcements (course_id, title, content, created_by)

Add columns to `courses`: `category_id` (foreign key to categories table).

All tables get RLS: public SELECT where appropriate, admin ALL via `has_role`.

### New Admin Pages

| Page | Route | Purpose |
|------|-------|---------|
| AdminCategories | `/admin/categories` | CRUD for course categories |
| AdminTags | `/admin/tags` | CRUD for course tags |
| AdminLearningPaths | `/admin/paths` | Create/manage learning paths, assign courses |
| AdminStudents | `/admin/students` | Dedicated student view (enrolled users with progress) |
| AdminQuizzes | `/admin/quizzes` | View/manage quizzes and questions per course |
| AdminQuizAttempts | `/admin/quiz-attempts` | View student quiz submissions and scores |
| AdminQnA | `/admin/qna` | Moderate Q&A discussions |
| AdminCourseAnnouncements | `/admin/announcements` | Per-course announcements |

### Updated Admin Sidebar

Reorganize sidebar sections to mirror Tutor LMS structure:

```text
Dashboard
  Overview
  Analytics

Tutor LMS
  Learning Paths
  Courses
  Categories
  Tags

Students
  Students
  Enrollments
  Quiz Attempts
  Q&A

Communication
  Announcements
  Email & Announcements

Marketing
  Influencer Marketing
  Pricing Plans

Content
  Instructors
  Testimonials
  Site Content

System
  Activity Log
  Settings
```

### Implementation Details

- Each new page follows the existing `AdminCrudTable` pattern for consistency
- **AdminQuizzes**: Accessed from course modules page -- add "Add Quiz" button per lesson, with a question builder dialog (multiple choice with correct answer marking)
- **AdminStudents**: Query `profiles` joined with `enrollments` to show per-student course progress, completion rates
- **AdminLearningPaths**: Drag-to-reorder courses within a path, similar to how modules work in `AdminCourseModules`
- **AdminQnA**: Show questions with replies threaded, allow admin to respond or delete
- Reuse existing UI patterns (Dialog forms, AdminCrudTable, motion animations)

### Files to Create
- `src/pages/admin/AdminCategories.tsx`
- `src/pages/admin/AdminTags.tsx`
- `src/pages/admin/AdminLearningPaths.tsx`
- `src/pages/admin/AdminStudents.tsx`
- `src/pages/admin/AdminQuizzes.tsx`
- `src/pages/admin/AdminQuizAttempts.tsx`
- `src/pages/admin/AdminQnA.tsx`
- `src/pages/admin/AdminCourseAnnouncements.tsx`

### Files to Modify
- `src/components/admin/AdminSidebar.tsx` -- new sidebar structure
- `src/App.tsx` -- add new routes
- `src/pages/admin/AdminCourseModules.tsx` -- add quiz management per lesson
- Database migration for all new tables + RLS policies

