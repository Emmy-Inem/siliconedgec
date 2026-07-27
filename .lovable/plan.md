## Goal

Two things: (1) make the Cohort Space something students *want* to open daily instead of asking for WhatsApp/Telegram, and (2) put every cohort-related control (members, course, lessons, assignments, quizzes, access) into one admin page under Cohorts.

---

## Part 1 — Make the Cohort Space sticky

Today the Discussion tab is a plain post list: no live updates, no reactions, no read state, no presence, no notifications when someone posts. It feels dead, so people leave for WhatsApp. Fixes, in order of impact:

**1. Real-time chat feel**
- Subscribe to `cohort_posts` via Realtime so new messages appear instantly without refresh (channel created/torn down in `useEffect`).
- Live "X is typing…" and an online-members presence row using a Realtime presence channel (no DB writes).
- Auto-scroll to newest, day separators ("Today", "Yesterday"), grouped consecutive messages by the same author.

**2. Reactions and replies that feel native**
- Emoji reactions on posts (new `cohort_post_reactions` table) with counts and tap-to-toggle.
- Existing thread replies get a compact "N replies" affordance that expands inline.
- @mention autocomplete of cohort members; a mention creates a notification linking straight to the post.

**3. Unread + notification loop (the main retention driver)**
- Per-user last-read marker (new `cohort_reads` table) → unread badge on the Cohorts nav item, on each cohort card, and on the Discussion tab.
- Notification on: new post in your cohort (throttled), a reply to your post, an @mention, a pinned announcement, a new session, new material.
- Mobile: existing notification bell deep-links into `/cohorts/:id?post=…`.

**4. Reasons to come back daily**
- **Pinned welcome/announcement bar** at the top of Discussion so the space never looks empty.
- **Upcoming session banner** with countdown + one-tap RSVP and "Join now" when live.
- **Cohort leaderboard** tab powered by existing XP (`get_user_xp` + `user_xp_events`): weekly points, lessons completed, assignments submitted. Small, friendly, opt-out-safe.
- **Progress strip**: "You: 6/20 lessons · Cohort average: 8/20" to create healthy pull.
- **Ask instructor** quick action that posts a question tagged `question`, filterable, and instructors can mark "answered".
- Rich composer: paste/upload images + files into the chat (reuse cohort materials bucket), link previews for URLs.

**5. Presence and polish**
- Member avatars in the roster show online dot; instructors get a badge.
- Empty state replaced with prompts ("Introduce yourself 👋") and starter buttons.
- WhatsApp-style mobile layout: sticky composer at the bottom, full-height scroll area, no double scrollbars.

---

## Part 2 — One admin Cohort control center

Rebuild `AdminCohorts` cohort detail into a tabbed workspace so nothing requires jumping to another page:

- **Overview** — cohort meta (name, number, dates, status, linked course), quick stats, danger zone.
- **Members** — existing add/remove/role, plus: bulk add by email/CSV, set instructor, and per-member access state (enrolled? cohort-only access? lessons unlocked?) with fix-it buttons.
- **Access** — grant/revoke the linked course to any member or the whole cohort in one click (reuses the manual-grant path with `access_source='manual_grant'`), admin-only.
- **Lessons** — full lesson list of the linked course with per-member and bulk **Unlock / Lock / Mark complete** toggles (folds `AdminLessonAccess` into this page).
- **Assignments** — create, edit, attach to a lesson, publish/hide, see submission counts, and open grading, scoped to the cohort's course.
- **Quizzes** — same: create manually with questions/options, publish/hide, AI-generated badge, per-lesson attach.
- **Sessions** and **Materials** — as today, with attendance marking.
- **Discussion moderation** — pin/delete posts, post an announcement to the cohort from admin.

Everything writes with admin-activity logging, and each tab refreshes the others' caches so the Courses ↔ Assessments ↔ Cohort views stay in sync.

---

## Technical notes

- New tables (migration, with GRANTs + RLS scoped to cohort membership): `cohort_post_reactions`, `cohort_reads`; add `attachment_url`/`kind` columns to `cohort_posts`.
- Add `cohort_posts`, `cohort_post_reactions` to the `supabase_realtime` publication.
- New notification triggers for posts/replies/mentions, all gated on cohort membership and `is_visible` where relevant.
- Reuse existing helpers: `is_cohort_member`, `is_cohort_instructor`, `user_can_access_course`, `seed_first_lesson_unlock`, `lesson_unlocks`.
- Admin cohort page split into small panel components under `src/pages/admin/cohort/` to keep files manageable.
