## Scope

Comprehensive QA pass across analytics, live chat, instructors, and the small "extras" surfaced by recent changes. Findings below were verified against the live database (74 enrollments / 74 webinar regs / 7,490 lead_sources / 6 chat conversations / 4 instructors) and the current source.

## What's already correct (no change needed)

- `AdminOverview`, `AdminAnalytics`, `AdminMarketingAnalytics`, `AdminLeadsHub`, `AdminEnrollments`, `AdminOrders`, `AdminStudents`, `AdminBusinessLeads` all use `fetchAllRows` (no 1000-row cap).
- Paid status normalization (`paid` + `confirmed`) and free-shadow dedupe are centralized in `src/lib/analytics-helpers.ts`.
- WhatsApp community URL on the Home "Meet them all" button is correct (`chat.whatsapp.com/Fk8RN2yDKS800vnIG8K98X` via `useSiteSettings`).
- Realtime publication includes `chat_messages` + `chat_conversations`.

## Issues to fix

### 1. Analytics accuracy (residual)

- **`AdminMarketingAnalytics` conversions miscount** (lines 127, 165, 176, 190): conversion math excludes only `page_visit` but counts `pageview` rows as conversions, inflating UTM/source/hour/page conversion totals. Fix: exclude both `pageview` AND `page_visit` (or use `isPageViewFormType` from `analytics-helpers`).
- **`AdminTrackingQA` 200-row cap** (line 86): swap the `.limit(200)` admin lead_sources read for `fetchAllRows` (or at least raise to a saner ceiling) so the QA dashboard reflects the full dataset.
- **`AdminMarketingAnalytics` recent-leads dot color** (line 1032): treats `enrollment` as the only conversion type; also color `paid_enrollment` / `course_registration` green so manual conversions show correctly.
- **Meta Pixel duplicate-init warning** (console: "Duplicate Pixel ID 802223455823137"): `setAnalyticsUserId()` calls `fbq("init", META_PIXEL_ID, { external_id })` after the base snippet already initialised the same pixel. Use `fbq("set", "userData", { external_id })` (or `fbq("init", META_PIXEL_ID_2, {external_id, em…})` only for advanced matching on the secondary pixel) so the primary pixel isn't re-initialised.

### 2. Live chat reliability

- **Chat hidden when not logged in**: `LiveChat` returns `null` when `!user`. That's intentional but means anonymous visitors can't start a conversation. Confirm with user — keep current behaviour or render a "Sign in to chat" CTA. (Default plan: keep current, just document.)
- **Admin inbox missing close-conversation control**: `AdminChat` has no way to mark a conversation `closed` (DB has the column). Add a "Close conversation" button that updates `chat_conversations.status = 'closed'` so resolved threads stop showing as open in counts.
- **Unread counter never resets when widget reopens on the same conversation**: `LiveChat` only zeros `unread_user_count` on initial open; if a new admin reply arrives while the widget is closed, opening it again skips the reset. Add a reset on widget open whenever `conversationId` already exists.
- **Realtime subscription cleanup**: works, but verify both channels (`chat-${id}` in widget, `admin-chat-list` + `admin-chat-${id}` in admin) unsubscribe on unmount — a quick read confirms they do; no change.

### 3. Instructors

- **Home cards link to nothing**: instructor cards in the home rail are not clickable. Wrap each card in a `<Link to={`/instructors/${inst.id}`}>` so visitors can reach `InstructorDetail` (route already exists and works). Keep the "Meet them all" WhatsApp link unchanged.
- **`students_count` is a manual field**: `AdminInstructors` lets admins type any number, and `InstructorDetail` displays it verbatim. Optional: derive it from `enrollments` for accuracy. Recommend keeping it manual for the marketing override but adding a small "Sync from enrollments" helper button in admin (low-risk, opt-in).
- **Course count on `InstructorDetail` ignores `instructor_id` consistency**: works only if courses have `instructor_id` set. Add a guard message and a quick admin note in tooltip — no schema change.

### 4. Small extras worth fixing in the same pass

- **`AdminOverview` "Recent Enrollments" badge** (line 358): already colors `paid` + `confirmed` green; verify `free` shows blue (webinar) and `pending` amber. Tiny CSS tidy.
- **`UtmTracker` GA pageview key** dedupes by `path+search` per session ref — fine, but the ref is recreated on hot-reload only; confirm no regression.
- **Influencer referral dedupe**: leftover from prior plan — show `unique_referrals = distinct (user_id, course_id)` in `AdminInfluencerMarketing` so a webinar→paid upgrade isn't double-counted in the leaderboard.

## Out of scope

- No DB schema or RLS changes.
- No new edge functions.
- No visual redesign of dashboards beyond the tiny badge/color fixes above.
- No changes to Paystack server flows or GA4/Meta server-side events.

## Files to touch

- `src/pages/admin/AdminMarketingAnalytics.tsx` — exclude both pageview form types; conversion dot colors.
- `src/pages/admin/AdminTrackingQA.tsx` — paginate lead_sources via `fetchAllRows`.
- `src/lib/analytics.ts` — stop re-initialising the primary Meta pixel in `setAnalyticsUserId`.
- `src/pages/admin/AdminChat.tsx` — add "Close conversation" action.
- `src/components/LiveChat.tsx` — reset `unread_user_count` whenever the widget opens an existing conversation.
- `src/pages/Index.tsx` — wrap instructor cards with `Link to /instructors/:id`.
- `src/pages/admin/AdminInstructors.tsx` — optional "Sync students from enrollments" helper.
- `src/pages/admin/AdminInfluencerMarketing.tsx` — unique-referrals dedupe.

## Verification after implementation

1. `psql` cross-check: Overview "Paid Enrollments" == Analytics "Paid Enrollments" == Leads Hub "Paid Enrollments" (currently all 0 — should remain consistent).
2. `psql` cross-check: Marketing Analytics "Total Visits" == count of `lead_sources` where `form_type IN ('pageview','page_visit')`; "Conversions" excludes both.
3. Browser smoke: open `/`, click an instructor card → lands on `/instructors/:id`; click "Meet them all" → opens WhatsApp community in new tab.
4. Browser smoke: open chat widget as a logged-in user, send a message; admin replies in `/admin/chat`; widget badge clears on reopen; admin "Close" sets status=closed and removes from active list.
5. Console: no more "Duplicate Pixel ID" warning.
