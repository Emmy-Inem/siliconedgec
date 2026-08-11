# Platform Audit: Email Delivery, Newsletter & Video Testimonials

## What I found

**Emails are not actually being delivered.** The `send-email` function only sends when a Resend key exists — no email key and no sender domain are configured on this project, so every automated email (welcome, enrollment, certificate, support escalation, live-class reminders, admin blasts) is silently logged and dropped. The automation queue is wired correctly (cron runs every 5 minutes, triggers exist) but the queue is empty and nothing has ever been sent.

**Newsletter is not a real feature.** The footer and signup component write subscribers into `business_leads` as fake "Newsletter Subscriber" B2B leads. There is no subscriber list, no groups, no unsubscribe, and no way to send a newsletter to subscribers.

**Testimonials are text-only.** No video field exists in the data model, admin form, or public page.

## Plan

### 1. Turn on real email sending
- Set up the sender domain on `siliconedgec.com` (one-click dialog — needs your confirmation) and switch all sending to Lovable's built-in email infrastructure with queueing, retries, bounce suppression and delivery logs.
- Rewire `send-email`, `run-automations`, `support-notify`, `send-bulk-announcement` and live-class reminders onto that pipeline so nothing is silently dropped again.

### 2. Branded email design system
- One shared branded layout: Silicon Edge logo header, purple/dark brand palette, brand headings, CTA button style, footer with contact details and unsubscribe.
- All existing templates (welcome, enrollment confirmed, first lesson, certificate ready, cohort access, assignment submitted/graded, support ticket, live class reminder, admin blasts, newsletter) re-rendered through it.
- Admin email-template editor gains a live branded preview and a "send test to me" button.

### 3. Automations verified end-to-end
- Audit each automation trigger against a real event, confirm the queue drains, and surface results in a new admin "Automation Health" view: per-automation on/off, last run, sent/skipped/failed counts, error text, and a retry button for failed events.

### 4. Newsletter
- Proper `newsletter_subscribers` table (email, name, user link, status, source, groups, confirmation + unsubscribe token) with correct access rules.
- Footer/signup components write here instead of `business_leads`, with double opt-in confirmation email.
- Admin Newsletter page: compose (with AI draft), pick audience — all subscribers, a saved group, learners of a specific course, paid customers, partners, or a single user — preview recipient count, send test, schedule or send now, and a history list with delivery stats.
- Public unsubscribe page + one-click unsubscribe link in every newsletter.

### 5. Video testimonials
- Add `video_url`, `thumbnail_url`, `media_type` and `is_published` to testimonials.
- Admin: upload or paste a video (direct file upload to storage, or YouTube/Vimeo link), pick a poster image, preview before saving.
- Public testimonials page: video cards with poster + play overlay, lightbox player, lazy loading, text cards unchanged, and a filter between "All / Video stories / Written". Video testimonials also appear on the home page and Business page trust sections, with VideoObject structured data for SEO.

### 6. Global feature sweep
Fix the gaps found across roles while in each area: broken or dead admin links, pages with UI but no working backend, missing empty and loading states, mobile layout breaks, and role-permission holes for instructor/partner/support/finance roles. Anything larger than a fix gets listed back to you rather than silently expanded.

## Technical notes
- Email: Lovable email infrastructure (queue + cron worker + send log), shared React Email templates under `supabase/functions/_shared/`, one send function reused by all triggers.
- Newsletter: new table with RLS + grants; anonymous visitors can insert a pending subscription only; admin-only reads.
- Testimonials: schema migration plus a storage bucket for video/poster uploads; public read limited to published rows.
- Newsletters go only to opted-in subscribers, always with an unsubscribe link, kept separate from transactional automation emails.

## Needs you
Email sending cannot be enabled without configuring the sender domain for `siliconedgec.com` — I will show that setup dialog first, then continue with everything above.