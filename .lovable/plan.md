
# Fix-All Plan — LMS, AI, Auth, PWA, Help Center

This is a large scope. I'll ship it in 6 batches so each one is reviewable and the app stays stable between them. Each batch ends in a working, deployable state.

---

## Batch 1 — LMS depth (student-facing)

**Assignment submissions + grading**
- New `AssignmentSubmissionPanel` on the lesson page for `lesson_type='assignment'`: text response + file upload to `course-resources/submissions/{user}/{assignment}/`.
- Show submission status (submitted / graded / score / feedback).
- Admin `AdminAssignmentSubmissions` page with rubric grading UI: score 0–100, written feedback, pass/fail; uses existing `notify_assignment_submission` trigger.

**Lesson discussions (threaded)**
- New table `lesson_comments` (lesson_id, user_id, parent_id, body, created_at) with RLS: enrolled users can read/write on their courses; admins moderate.
- `LessonDiscussion` component with reply nesting, edit/delete own, soft-delete by admin.

**Resume CTA**
- Dashboard course cards: when `enrollments.last_lesson_id` is set, "Continue" button links to `/courses/{slug}/learn?lesson={id}`. Falls back to first incomplete lesson.

**Player upgrades**
- Add playback speed (0.5–2x), Picture-in-Picture button, keyboard shortcuts (space=play, ←/→=10s seek, f=fullscreen, m=mute, ↑/↓=volume).
- Persist last speed in localStorage per user.

**Offline / bulk download**
- "Download all resources" button in course sidebar → zips signed URLs from `lesson_resources` via JSZip on the client.
- Per-lesson transcript/notes export to .txt.

---

## Batch 2 — AI completeness

**Lesson-aware grounding for ai-tutor**
- Edge function fetches `lessons.content`, `lesson_transcripts.transcript`, and module title for the active `lesson_id` passed from the client; injects as system context with token budget.
- Add citations: model is instructed to cite `[L1]`, `[L2]` referring to lesson sections; `MarkdownView` renders these as anchored chips that scroll to the source paragraph.

**Conversation history sidebar**
- `LessonCompanion` gets a collapsible left rail listing past `ai_conversations` for the current course, with new-chat + delete actions. Threads switch via URL param `?chat={id}`.

**Whisper transcript ingestion**
- New edge function `transcribe-lesson` uses Lovable AI Gateway (Gemini for speech-to-text not available — use Whisper via OpenAI-compatible path supported by gateway; if not supported, surface a clear message and queue a manual upload field instead).
- Admin "Generate transcript" button on each video lesson. Stores in `lesson_transcripts`.

**AI catalog search**
- `/courses` adds a natural-language search bar. Edge function `ai-course-search` returns ranked course IDs from a structured query (parses "beginner AWS under ₦50k" → filters: level, category, max_price) using `Output.object`.

**AI announcement / email drafting**
- "Draft with AI" button in `AdminEmail` and `AdminCourseAnnouncements`. Opens a dialog: tone, audience, key points → streams a draft into the editor.

**AI business-lead qualifier**
- Edge function `ai-qualify-lead` scores each new `business_leads` row 1–100 with rationale (company size, intent signal, budget hints). Trigger runs on insert. Admin lead list shows score + rationale.

---

## Batch 3 — Auth & accounts hardening

**Email verification enforcement**
- `configure_auth` to require confirmed email.
- Add `<RequireVerified>` wrapper around purchase, enrollment, and AI features; show a "Resend verification" banner if `user.email_confirmed_at` is null.

**Admin MFA (TOTP)**
- Enable Supabase MFA factors. New `AdminMfaSetup` page: enroll TOTP, verify code, store factor.
- Admin route guard requires `aal2` for users with admin role; if missing, redirect to MFA challenge.

**Magic-link sign-in**
- Add "Email me a magic link" tab on `/signin` using `supabase.auth.signInWithOtp`.

**LinkedIn OAuth**
- LinkedIn isn't in Lovable Cloud's native providers. I'll wire it through the LinkedIn connector for sign-in: edge function `linkedin-oauth-callback` exchanges code, creates/updates a Supabase user via service role, then issues a session. (If the user prefers, they can instead connect external Supabase for native LinkedIn provider; I'll proceed with the connector path by default.)

**User session management UI**
- `ProfileSettings` adds an "Active sessions" tab: lists rows from `auth.sessions` via a SECURITY DEFINER RPC scoped to `auth.uid()`; "Revoke" button calls `supabase.auth.admin.signOut(session_id)` from an edge function.

**Account deletion cascade audit**
- Add `delete-account` edge function that: anonymizes `profiles`, hard-deletes `enrollments/lesson_progress/notes/bookmarks/ai_conversations`, retains `orders/certificates` with a `deleted_user` flag for compliance, then deletes the auth user.
- Document the audit in `docs/account-deletion.md`.

---

## Batch 4 — Learning paths (student view) + PWA

**Learning paths student-facing**
- `/paths` index page: cards for each published path.
- `/paths/:slug` detail: ordered courses, locked/unlocked indicator, aggregate progress bar from enrollments, "Start next course" CTA.
- Path completion certificate (reuses certificate template).

**PWA**
- Use the PWA skill's `vite-plugin-pwa` offline path since the user wants offline lessons in Batch 1.
- `registerType: autoUpdate`, NetworkFirst for HTML, CacheFirst for hashed assets, exclude `/~oauth`.
- Registration wrapper with the required Lovable-preview/iframe/dev guards and `?sw=off` kill switch.
- iOS install hint card on first mobile visit.

---

## Batch 5 — Help Center / KB

- New tables: `kb_categories`, `kb_articles` (slug, title, body markdown, category_id, is_published, views, helpful/unhelpful counts).
- Public `/help` index with search; `/help/:slug` article page.
- Admin CRUD at `/admin/help` with markdown editor and AI "Improve article" button.
- Floating help widget (bottom-right) with article search; falls back to "Contact support" → existing LiveChat.

---

## Batch 6 — Hardening verification

- Run security scan; resolve any new findings introduced by the above migrations (RLS grants on `lesson_comments`, `kb_articles`, etc.).
- Add a few targeted Vitest tests: lesson comments RLS, AI catalog search structured output, account deletion idempotency.
- Smoke-test payments end-to-end (cart + single + webhook retry).

---

## Technical details (one place)

```text
New tables
  lesson_comments(id, lesson_id→lessons, user_id→auth.users, parent_id→lesson_comments, body, deleted_at)
  kb_categories(id, slug, title, order_index)
  kb_articles(id, category_id, slug, title, body_md, is_published, views, helpful, unhelpful)
  mfa_required_roles (optional: role → require_aal2 bool)

New edge functions
  transcribe-lesson           (admin-triggered, service role, writes lesson_transcripts)
  ai-course-search            (Output.object → {level, category, max_price, tokens})
  ai-draft-announcement       (streaming text)
  ai-draft-email              (streaming text)
  ai-qualify-lead             (Output.object → {score, rationale}; trigger via DB → pg_net or admin button)
  ai-tutor                    (UPDATED: load lesson context + transcripts; cite [L#])
  linkedin-oauth-callback     (code exchange + session issuance)
  delete-account              (cascade + anonymize, service role)
  revoke-session              (service role admin.signOut(session_id) for caller's own sessions)

Frontend additions
  src/components/learning/AssignmentSubmissionPanel.tsx
  src/components/learning/LessonDiscussion.tsx
  src/components/learning/DownloadAllButton.tsx
  src/components/player/EnhancedVideoPlayer.tsx        (speed/PiP/keys)
  src/components/ai/ChatHistorySidebar.tsx             (wire to LessonCompanion)
  src/components/ai/CourseSearchBar.tsx
  src/components/help/HelpWidget.tsx
  src/pages/LearningPaths.tsx / LearningPathDetail.tsx (student)
  src/pages/Help.tsx / HelpArticle.tsx
  src/pages/admin/AdminAssignmentSubmissions.tsx
  src/pages/admin/AdminHelp.tsx
  src/pages/admin/AdminMfaSetup.tsx
  src/components/auth/MagicLinkTab.tsx
  src/components/auth/LinkedInButton.tsx
  src/components/account/ActiveSessionsTab.tsx
  src/components/account/VerifyEmailBanner.tsx

PWA
  vite-plugin-pwa added with generateSW, guarded register wrapper
  public/sw.js path reserved for kill-switch if needed
```

---

## Order of operations

I'll ship Batch 1 first end-to-end (DB migration → backend → UI → smoke test), then return for approval/feedback before starting Batch 2. This keeps each delivery reviewable instead of one giant change set.

Two quick confirmations before I start:
1. **LinkedIn OAuth path**: connector-based sign-in (works on Lovable Cloud) vs migrating auth to external Supabase for native provider. I'll default to **connector-based** unless you say otherwise.
2. **Whisper transcripts**: Lovable AI Gateway doesn't currently expose Whisper. I'll add a **manual transcript upload + paste** path in admin and an "AI clean-up" pass instead of speech-to-text. OK?
