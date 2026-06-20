
# Gap Audit — Missing Pages & Admin Functionality

Based on a scan of `src/pages/`, `src/pages/admin/`, and the routes registered in `src/App.tsx`, here is what is **still missing** (or thin) for a production-grade LMS + commerce + jobs platform like Silicon Edge.

---

## A. Public / Marketing pages that are missing

| # | Page | Why it matters |
|---|------|---------------|
| 1 | `/about` (About / Company / Mission / Team) | Trust + SEO. Currently only `/trust`. No story, no team bios surfaced. |
| 2 | `/contact` | No dedicated contact page with form, address, support email, hours. |
| 3 | `/blog` index + `/blog/:slug` | `AdminBlog` exists and `blog_posts` table exists, but **no public blog routes**. Content is being created with nowhere to read it. |
| 4 | `/instructors` (index) | `/instructors/:id` exists, but no directory page to discover them. |
| 5 | `/testimonials` or `/success-stories` | `testimonials` table exists, no public showcase page. |
| 6 | `/faq` (standalone) | FAQs are scattered inside Pricing / Trust / Business. No global FAQ hub. |
| 7 | `/terms`, `/privacy`, `/refund-policy`, `/cookie-policy` | Legal pages — required for payments (Paystack/Stripe), GDPR, and app store / ad trust. Currently only `/trust`. |
| 8 | `/sitemap` (HTML) | Have XML sitemap, no human sitemap page. |
| 9 | `/blog/category/:slug` & `/blog/tag/:slug` | Blog taxonomy navigation. |
| 10 | `/search` (global site search results page) | No search results route. |
| 11 | `/categories/:slug` and `/tags/:slug` for courses | Course taxonomy landing pages — strong SEO surfaces. |
| 12 | `/compare` (course/path compare) | Helpful for high-ticket decisions. |
| 13 | 410 / `gone_urls` rendered page | Table exists; no public handler returning proper 410 page. |
| 14 | `/maintenance` and a real branded `500` error boundary page | Only NotFound exists. |

## B. Authenticated student-area pages missing

| # | Page | Notes |
|---|------|------|
| 15 | `/account/profile` (edit profile, avatar, bio, password, 2FA) | Profile editing surface not present. |
| 16 | `/account/orders` & `/account/orders/:id` (invoice/receipt download) | Orders table exists; student-facing order history missing. |
| 17 | `/account/billing` (payment methods, invoices, tax info) | Not present. |
| 18 | `/account/notifications` (preferences + history) | Notifications table exists; no preference center. |
| 19 | `/account/security` (sessions, login history, password, 2FA) | `AdminSessions` + `login_attempts` exist for admin only. |
| 20 | `/wishlist` | `AdminWishlistInsights` exists; **no student wishlist page**. |
| 21 | `/bookmarks` | `bookmarks` table exists; no listing UI. |
| 22 | `/my-certificates` | Have `/certificates` public page, but no personal earned-certificates index. |
| 23 | `/my-learning-paths` / progress on paths | Path detail exists, no enrolled-paths view. |
| 24 | `/messages` / `/inbox` | `chat_conversations` table; no student inbox UI confirmed. |
| 25 | `/refer` (student referral dashboard) | `influencer_referrals` is admin only. |
| 26 | `/jobs/applied` (student application history) | `job_applications` table; no student view. |

## C. Admin functionality gaps

Existing admin surfaces are extensive, but the following are missing or incomplete:

1. **Role & Permission management UI** — `user_roles` enum exists, but no UI to assign/revoke `admin`/`moderator`/`user` per account from `AdminUsers`.
2. **Refunds & disputes workflow** — `AdminOrders` exists, but no refund issuance, partial refund, chargeback log, or Paystack/Stripe refund actions.
3. **Coupons / Promo codes UI** — `promo_codes` table (21 cols!) has no dedicated admin CRUD page; only referenced via influencer marketing.
4. **Tax / VAT settings** per region.
5. **Email deliverability dashboard** — bounces, complaints, opens, unsubscribes; `email_announcements` lacks analytics view.
6. **Webhook events viewer** — `webhook_events` table exists; no admin inspector / replay UI (only `AdminAuthReplay`).
7. **Knowledge Base admin** — `kb_articles`, `kb_categories` tables exist; no admin CRUD page.
8. **CMS pages versioning / drafts / preview** — `AdminPages` exists; revision history and unpublished preview missing.
9. **Blog editor enhancements** — categories, scheduling, SEO per post, OpenGraph image picker (verify in `AdminBlog`).
10. **Bulk operations** — bulk enroll, bulk email, bulk certificate issuance, CSV import for students/courses/jobs.
11. **Reports & exports** — revenue report, refunds report, enrollments by cohort, tax report, instructor payout report. (`AdminAnalytics` likely doesn't cover finance reports.)
12. **Instructor payouts / revenue share** — no payouts schema or admin screen.
13. **Discussion / Q&A moderation tools** — flagging, ban, soft-delete; `lesson_comments` has no moderation UI.
14. **Reviews moderation** — approve / reject / reply (verify in `AdminReviews`).
15. **Spam / abuse / IP block UI** — `blocked_ips` table exists, no admin CRUD page.
16. **GDPR tooling** — user data export (DSAR) and account deletion request handling.
17. **Audit log search & export** — `AdminActivityLog` likely lacks date-range export.
18. **Feature flags / A-B test toggles**.
19. **Cohorts / batches** management for live classes (registration windows, capacity, waitlist).
20. **Waitlists** for sold-out / not-yet-launched courses.
21. **Assignment grading rubrics & gradebook** — submissions exist, no gradebook view per course / per student.
22. **Quiz question bank** with tagging & reuse across quizzes.
23. **Proctoring / attempt review** for quizzes.
24. **Live class attendance & recordings library** — recordings index, attendance export.
25. **Scheduled / drip content rules** for lessons.
26. **Backup restore UI** — `AdminBackupStatus` shows status; trigger/restore/download buttons missing.
27. **Maintenance mode toggle** in `AdminSettings`.
28. **Translations / i18n admin** — string overrides per locale.
29. **Affiliate payout management** (separate from influencer link tracking).
30. **Push notifications (web push) admin** — only in-app + email exist.
31. **Onboarding checklist** for new admins on first login.
32. **Global search inside admin** (cmd-K) across courses, users, orders.

## D. Cross-cutting / quality gaps

- No `robots`-aware OG image generator per route (open-graph default falls back).
- No RSS feed (`/rss.xml`) for blog — easy SEO win.
- No `/api/health` or status badge surfaced anywhere.
- No cookie consent banner (visible) → GDPR risk if EU traffic.
- Newsletter signup endpoint + admin subscriber list missing.
- No `/changelog` or `/roadmap` page (optional but valued).
- Course detail SEO: BreadcrumbList JSON-LD and Course JSON-LD verification needed.
- 404 page does not link to popular / recent courses.

---

## Proposed scope for the next build pass

Because this is a long list, propose tackling it in **three prioritized waves**. I can implement any subset you approve:

**Wave 1 — Legal & trust essentials (blocks payments/SEO):**
- `/terms`, `/privacy`, `/refund-policy`, `/cookie-policy`
- Cookie consent banner
- Public `/blog` + `/blog/:slug` (data already exists)
- `/contact` + `/about`
- Admin: Role management UI in `AdminUsers`, Promo codes CRUD page

**Wave 2 — Student account & commerce depth:**
- `/account/profile`, `/account/orders` (+ invoices), `/wishlist`, `/bookmarks`, `/my-certificates`, `/account/notifications`
- Admin: Refunds, Webhook events viewer, Reviews moderation polish, Blocked IPs UI, GDPR export/delete

**Wave 3 — LMS depth & ops:**
- Instructors index, Testimonials page, Categories/Tags landing pages, global Search page, 410 handler, RSS feed
- Admin: Gradebook, Quiz question bank, Live class attendance & recordings, Instructor payouts, Maintenance toggle, Backup restore, Admin cmd-K

---

**Which wave (or specific items) should I implement first?** Once you pick, I'll switch to build mode and ship them.
