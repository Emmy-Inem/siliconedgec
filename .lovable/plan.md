# Silicon Edge Consulting — Full Audit

A scan of routes, components, edge functions, DB schema, secrets, and admin pages. Below is what's already shipped, what's partial, and what's missing — grouped so you can pick what to build next.

---

## 1. LMS (Learning experience)

**Working:** Course catalog, enrollment, video lessons, lesson progress + auto-progress trigger, quizzes (secure RPC), certificates (auto-issue + verify), bookmarks, reviews, Q&A, course announcements, live classes (Zoom links, reminders), study plan generator, AI lesson companion.

**Partial / missing:**
- **Assignments & file submissions** — `CurriculumBuilder` has an "assignment" lesson type, but there's no submission UI, no `assignment_submissions` table, no grading flow.
- **Discussions per lesson** — Q&A exists at course level only; no threaded comments under each lesson.
- **Notes & highlights** — students can't take in-lesson notes or highlight transcript passages.
- **Resume-where-you-left-off** — `lesson_progress` is tracked but no "Continue learning" deep-link from Dashboard to the exact lesson + timestamp.
- **Video transcripts / captions** — no transcript storage, so AI tutor lacks ground truth for "explain this section."
- **Playback speed, picture-in-picture, keyboard shortcuts** — basic player only.
- **Offline / downloadable lessons** — not implemented (course-resources bucket exists but no UI to bulk-download).
- **Learning paths** — `AdminLearningPaths` exists; no student-facing path browser or progress meter.
- **Prerequisites & locked lessons** — schema doesn't enforce sequential unlocking.
- **Gamification** — no XP, streaks, badges, leaderboard.
- **Mobile/PWA install** — no manifest + service worker for offline reading.

---

## 2. AI Integrations

**Working:** `ai-tutor` (streaming chat), `ai-quiz` (generate + grade), `ai-study-plan`, `ai-recommend` (Next Step card), `generate-quiz` (admin), `QuizAIGenerator`.

**Missing (from the original plan in `.lovable/plan.md`):**
- **AI Career Coach** — match completed courses → jobs on `/jobs`, gap analysis, 1-paragraph cover-letter draft. Planned but never built.
- **AI Mock Interview / Practice mode** — per-track text interview with rubric scoring.
- **Instructor Assist** — auto-draft lesson summaries, course descriptions, SEO meta inside the course wizard.
- **AI search** across catalog ("show me beginner AWS courses under ₦50k").
- **AI announcements/email drafting** in admin email composer.
- **AI business-lead qualifier** — auto-score and reply-draft for `business_leads`.
- **Lesson-aware context grounding** — `ai-tutor` doesn't actually load the lesson transcript/markdown server-side (system prompt is generic). Needs RAG-lite: pull lesson `content_url` content + module title.
- **Conversation history UI** — `ai_conversations` table exists but no "previous chats" sidebar in `LessonCompanion`.
- **Citations** — promised in plan, not rendered in MarkdownView.

---

## 3. Commerce & Payments

**Working:** Paystack single + cart checkout, refunds, promo codes, influencer referrals, receipts, cart abandonment tracking, orders admin.

**Missing:**
- **Stripe** — no international card payments. Only Paystack (NGN). The model recommends `payments--enable_stripe`.
- **Subscriptions / payment plans** — courses are one-time only; no installments.
- **Invoices (downloadable PDF)** for B2B leads — receipts exist but B2B invoicing doesn't.
- **Tax/VAT handling** for non-Nigerian buyers.
- **Wishlist → email reminder** — wishlist insights exist for admin, but no automated "price drop / back in stock" email to users.
- **Bundles** — buy a learning path as a discounted bundle.
- **Gift a course / team seats** purchase flow.

---

## 4. Authentication & Accounts

**Working:** Email/password, Google OAuth (per memory), password reset, role gating (admin/moderator), login lockout, IP block, profile settings.

**Missing:**
- **Email verification enforcement** — confirm config matches policy (sign-up flow doesn't block unverified users from key actions).
- **2FA / MFA** for admins.
- **Magic-link sign-in** option.
- **Social providers beyond Google** (LinkedIn would convert B2B leads).
- **Account deletion confirmation flow** — `ProfileSettings` has DELETE input but no server-side cascade audit.
- **Session management UI** — `AdminSessions` exists for admins; users can't see/revoke their own active sessions.

---

## 5. Jobs / Career

**Working:** Job listings, job detail, applications, admin management, resume uploads (`job-resumes` bucket).

**Missing:**
- **Application status tracking for candidates** (trigger exists, but no candidate-facing timeline page).
- **Saved jobs / job alerts by email.**
- **Employer self-serve portal** — only admins can post jobs.
- **AI résumé scoring / matching** against job descriptions.
- **"Apply with profile"** auto-fill from completed courses + certificates.

---

## 6. Communications

**Working:** In-app notifications, real-time bell, course announcements, bulk email, transactional `send-email`, live chat (user ↔ admin), live-class notifications.

**Missing:**
- **Email infrastructure / verified sending domain** — check `email_domain` status; transactional may be on the default sandbox.
- **Email templates editor preview** — `AdminEmailTemplates` exists; verify render preview + test-send works.
- **SMS / WhatsApp transactional** (only WhatsApp FAB exists; no automated triggers).
- **Push notifications** (web push) for live-class start, new messages.
- **Discussion replies → email digest.**

---

## 7. Marketing & Analytics

**Working:** UTM tracking, influencer attribution, GA4, cart abandonment, marketing analytics dashboard, lead sources, promo codes.

**Missing:**
- **Funnel visualization** beyond raw events.
- **A/B testing framework** for hero/CTA.
- **Conversion pixel manager UI** — `CustomScripts` covers raw scripts, but no per-event Meta/TikTok pixel mapper.
- **Referral program for students** (separate from influencers).
- **Newsletter / blog subscription** — Footer has email input but no list storage / double opt-in.
- **Blog comments / social share counts.**

---

## 8. Admin / Ops

**Working:** ~50 admin pages including hubs, course health, wishlist insights, login security, activity log, auth replay, sessions, brands, media, pages CMS.

**Missing / partial:**
- **Bulk import/export** — `admin-export-users` exists; no bulk course/CSV import.
- **Audit trail diff view** — activity log shows events, no before/after.
- **Scheduled tasks dashboard** — `live-class-reminder` runs (logs show shutdowns), but no cron management UI.
- **Backup status** — `backup-to-drive` function exists; no admin page showing last successful backup.
- **Feature flags / kill switches** beyond Public Access Mode.
- **Help center / knowledge base** for students.

---

## 9. Connectors & External Integrations

**Currently wired:** Google OAuth, Google Calendar (sync edge fn), Google Drive (backup, key managed), Google Search Console (key managed), Paystack.

**Missing / recommended:**
- **Stripe** — international payments (use `payments--enable_stripe`).
- **Resend / SendGrid verified domain** — confirm email delivery infra.
- **Zoom API** (currently just stored links) — auto-create meetings + recordings ingestion.
- **YouTube unlisted upload** integration for lesson hosting.
- **Slack / Discord** webhooks for new lead, new enrollment, failed payments.
- **HubSpot / CRM sync** for `business_leads`.
- **Cloudflare R2 / image CDN** for hero images (currently public Supabase buckets).
- **OpenAI Whisper** edge fn for auto-transcripts (feeds AI tutor grounding).

---

## 10. Configuration & Hardening

- `supabase/config.toml` does **not** declare `verify_jwt` for the four `ai-*` functions — defaults to verifying, fine, but should be explicit.
- No `import_map.json` for edge functions (each redeclares deps).
- **PWA manifest + icons** missing.
- **robots.txt / sitemap.xml** exist; verify dynamic sitemap covers all blog/course slugs.
- **CSP headers** — none set (would require edge middleware).
- **Rate limiting** — only on login; AI endpoints rely on gateway limits.
- **Accessibility audit** — no automated a11y tests; suggest adding `vitest-axe`.
- **Lighthouse / performance budget** — no CI check.
- **Error monitoring** (Sentry) — not installed.
- **Security memory** is current; re-run `security--run_security_scan` to confirm zero open findings.

---

## Suggested next-build batches

Pick any of these and I'll build it:

1. **Finish the AI vision** — Career Coach + Mock Interview + Instructor Assist + lesson-context grounding for `ai-tutor` (+ citations + chat history sidebar).
2. **Complete LMS depth** — Assignments + submissions, lesson notes, resume-where-you-left-off, learning-path student view, gamification (XP/streaks/badges).
3. **Global payments** — Enable Stripe, add subscriptions/installments, B2B invoices.
4. **Email + comms infra** — Verify sending domain, push notifications, Slack webhooks for ops events.
5. **Connector expansion** — Zoom API, Whisper transcripts, HubSpot CRM sync, Sentry.
6. **Hardening** — PWA, CSP, Sentry, a11y tests, Lighthouse CI, backup status page.

Tell me which batch (or specific items) to build, and I'll switch to build mode and ship it.
