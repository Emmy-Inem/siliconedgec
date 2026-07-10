# Fixes: notifications, quiz flow verification, header overlap

## 1. Mobile notification bell (main new work)
`src/components/Header.tsx` — the mobile toolbar (`lg:hidden` section, ~line 122) currently only renders the cart icon and the hamburger toggle. `UserNotificationBell` only appears inside the `hidden lg:flex` desktop block.

Change: render `<UserNotificationBell />` in the mobile toolbar too, placed to the left of the cart icon, only when `user` is present. The bell component itself is already responsive — its dropdown panel is a fixed-width (`w-80`) card anchored to the button, which fits within a 375px viewport. No changes needed inside `UserNotificationBell.tsx`; it fetches from the same `notifications` table and subscribes to the same realtime channel as desktop.

Result: signed-in mobile users see the bell + unread badge in the top bar, can open the panel, mark items read, and tap through to `n.link` — matching desktop behavior from the same data source.

## 2. Cohort page header overlap
`src/pages/CohortSpace.tsx` — `<Header />` is `fixed top-0 h-14`, but `<main className="flex-1">` has no top offset, so the cohort hero + "Cohort not available" fallback slide under the header on all breakpoints (the reported "hamburger blocking the header" symptom).

Change: add `pt-14` to the `<main>` element in both the forbidden branch (line 62) and the main return (line 77). Nothing else on that page needs to move.

Sweep sibling pages that also mount `<Header />` directly without a top offset and apply the same `pt-14` fix where the first child visibly clips under the header. Candidates to check with a quick grep and fix only where they clip: `Bookmarks.tsx`, `Cohorts.tsx`, `Cart.tsx`, `Account.tsx`, `OrderDetail.tsx`, `QuizAttempts.tsx`, `Refer.tsx`, `Search.tsx`. Skip pages whose first section already includes `pt-*` or a hero that intentionally starts at y=0.

## 3. Quiz modal parity + AI toggle — verify only
Both are already implemented in `src/components/admin/CurriculumBuilder.tsx`:
- "Attach to lesson" select for quizzes (lines 726–745) with a "Create new lesson slot" option, writing `lesson_id` on save (line 282–288). No unique-constraint logic present. ✅
- Per-lesson `AI on/off` pill (lines 96–110) that updates `is_visible` on rows scoped to `is_ai_generated = true` for both `quizzes` and `assignments`, so manual rows are untouched. ✅
- Manual quiz save inserts `is_ai_generated: false, is_visible: true` and persists inline questions to `quiz_questions` in the same mutation (lines 282–313). ✅

No code change here — call these out in the closing summary so the user knows they're covered and were re-verified.

## 4. End-to-end smoke check after edits
Open the preview at mobile viewport, sign in, and confirm: (a) bell renders and opens on mobile, (b) `/cohorts/:id` hero is no longer under the fixed header, (c) admin curriculum → Add Quiz still saves with a lesson attached and shows to enrolled students.

## Technical notes
- Files edited: `src/components/Header.tsx`, `src/pages/CohortSpace.tsx`, plus any sibling pages found to clip (add `pt-14` to their `<main>` only).
- No schema, RLS, or notification-trigger changes — the existing `notify_assignment_published` / `notify_quiz_published` triggers plus realtime subscription in `UserNotificationBell` already power the flow; exposing the bell on mobile is what unblocks users seeing it.
- No changes to `UserNotificationBell.tsx`, `CurriculumBuilder.tsx`, quiz save logic, or AI-toggle mutation.
