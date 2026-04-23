

## Reorganize Admin Panel + AI Quiz Generation + Improved LMS Builder

### Goals
1. **Collapse 50+ sidebar buttons into ~9 grouped hubs** with internal tabs.
2. **Sidebar gets its own independent scrolling** (doesn't move with main page).
3. **AI-powered quiz generation** (Lovable AI Gateway) + manual mode in one builder.
4. **Course builder rebuilt as a 3-step wizard** (Basics → Curriculum → Additional) like the screenshots: unlimited modules → unlimited lessons (video / text / quiz / assignment) → resources, with inline quiz attach.

---

### 1. Sidebar consolidation

Reduce from ~55 leaf items in 8 sections to **9 hub pages + Overview**. Each hub uses internal `<Tabs>` to surface former pages as tabs — same data, no functionality lost.

| New sidebar entry | Tabs inside |
|---|---|
| Overview | (single page, unchanged) |
| Analytics | Platform · Marketing · Course Health · User Activity · Wishlist Insights |
| **Courses** | Courses · Categories · Tags · Brands · Learning Paths · Reviews · Certificates · Instructors |
| **People** | Leads Hub · Students · Enrollments · Webinar Registrations · Business Leads · Q&A |
| **Assessments** | Quizzes (with AI builder) · Quiz Attempts |
| **Communication** | Announcements · Notifications · Live Classes · Live Chat · Email Blasts · Email Templates |
| **Commerce** | Orders · Pricing Plans · Cart Abandonment · Influencer Marketing |
| **Jobs** | Job Listings · Applications |
| **Content** | Home Page · Site Content · Pages · Blog · Testimonials · Media Library |
| **System** | Users & Roles · Settings · Login Security · Active Sessions · Activity Log · SEO · Custom Scripts |

**Implementation**: keep the existing `Admin*.tsx` page components — just create thin "hub" pages (e.g. `AdminCoursesHub.tsx`) that render a `<Tabs>` shell and reuse the existing pages as tab content. Old routes (`/admin/categories`, `/admin/tags`, etc.) keep working as redirects to `/admin/courses?tab=categories` so search/external links don't break.

### 2. Sidebar independent scroll

Currently the sidebar is `flex flex-col` inside `min-h-screen`, but the main `<motion.main>` has `overflow-auto` while the page itself can also scroll on smaller viewports.

**Fix in `AdminLayout.tsx`**:
- Outer wrapper: `h-screen overflow-hidden` (instead of `min-h-screen`).
- Sidebar `<aside>`: `h-screen sticky top-0 overflow-hidden` with the inner `<nav>` already `overflow-y-auto` — that internal nav becomes the only scrollable region of the sidebar.
- Main column already has `overflow-auto` — confirmed independent.

Result: sidebar stays put while main content scrolls; scrolling the sidebar list never moves the main page.

### 3. AI + manual quiz builder

New page **`AdminQuizBuilder.tsx`** (replaces `AdminQuizzes.tsx` content; old route redirects here):

- Quiz list (existing) on the left.
- "New Quiz" opens a two-mode dialog:
  - **Manual** — current question editor (already works).
  - **Generate with AI** — fields: source (paste text / pick lesson / pick course outline), number of questions (3–20), difficulty (easy / medium / hard), question type (MCQ for now). Calls a new edge function `generate-quiz` → Lovable AI Gateway (`google/gemini-2.5-flash`) with a JSON schema returning `[{question, options[4], correct_answer, explanation}]`. Results render in an editable preview list — user can tweak/delete/add before clicking **Save Quiz** which inserts into `quizzes` + `quiz_questions`.
- Edge function: `supabase/functions/generate-quiz/index.ts`, uses `LOVABLE_API_KEY` (already provisioned), `verify_jwt = true`, admin-only (checks `has_role(uid, 'admin')` via service-role query).

### 4. Improved course builder (modules + lessons)

Upgrade `AdminCourseModules.tsx` (renamed conceptually to "Curriculum") and integrate it into the existing **3-step wizard** (`AdminCourseCreate.tsx` already handles step 1 Basics + step 3 Additional — we add step 2 Curriculum):

```text
[1 Basics] ── [2 Curriculum] ── [3 Additional]
```

- **Step 2 Curriculum** (new tab in the wizard, mirrors Tutor LMS layout from screenshots):
  - **Unlimited modules** ("+ Add Module"), drag-to-reorder via `@dnd-kit` (already supported by `GripVertical` icon).
  - Inside each module: **unlimited lessons** with type buttons `+ Lesson` `+ Quiz` `+ Assignment` (each opens a typed dialog).
  - Lesson types fully supported in DB today (`lessons.content_type`): video (URL or upload), text (rich content), quiz (links to quiz row), assignment (instructions + due date).
  - Inline "Generate quiz with AI" button on a lesson auto-creates a quiz tied to that lesson using its title + description as prompt.
  - Drag-to-reorder lessons within a module; persist `order_index` on drop.
  - Resources panel per lesson (already works via `LessonResourcesManager`).

- **Step 3 Additional**: keep existing fields, add the missing ones from the screenshot — *What Will I Learn?*, *Target Audience*, *Total Course Duration (hours/min)*, *Requirements / Instructions*. These are already stored in `courses` table (text columns); just surface them.

- Auto-save on each step (already present) preserved.

---

### Files

**New**
- `src/pages/admin/hubs/AdminCoursesHub.tsx`, `AdminPeopleHub.tsx`, `AdminAssessmentsHub.tsx`, `AdminCommunicationHub.tsx`, `AdminCommerceHub.tsx`, `AdminContentHub.tsx`, `AdminSystemHub.tsx`, `AdminAnalyticsHub.tsx`, `AdminJobsHub.tsx` — each renders a `<Tabs>` shell loading the existing page components.
- `src/components/admin/QuizAIGenerator.tsx` — AI generation panel + editable preview.
- `supabase/functions/generate-quiz/index.ts` — Lovable AI call with JSON schema.

**Edited**
- `src/components/admin/AdminSidebar.tsx` — replace section list with the 9 hubs + Overview; remove all leaf items.
- `src/pages/admin/AdminLayout.tsx` — `h-screen overflow-hidden` wrapper for independent sidebar scroll.
- `src/App.tsx` — add hub routes; keep legacy routes as `<Navigate replace>` redirects to `/admin/<hub>?tab=<slug>`.
- `src/lib/admin-permissions.ts` — update route lists to new hubs.
- `src/pages/admin/AdminCourseCreate.tsx` — add Curriculum as step 2 of the wizard.
- `src/pages/admin/AdminCourseModules.tsx` — refactored as the curriculum step (kept as standalone too); add dnd reorder, quiz/assignment buttons, AI quiz button.
- `src/pages/admin/AdminQuizzes.tsx` — add AI mode tab in the create dialog.

### Verification after build
1. Sidebar shows ≤10 entries; clicking each opens a tabbed hub with all former pages reachable.
2. Sidebar scrolls independently — scroll long sidebar with main content still pinned; scroll main page with sidebar still pinned.
3. Course builder: create a course → step 2 → add 3 modules, mix of lesson + quiz + assignment in each → reorder → save.
4. Quizzes: AI mode generates 5 questions from a pasted paragraph → edit one → save → appears in list.
5. Old URLs (e.g. `/admin/categories`) auto-redirect to the Courses hub with the correct tab pre-selected.
6. Moderator role still gated correctly via updated permissions list.

