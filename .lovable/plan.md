

# Plan: Major Feature Expansion to Match WordPress Stack

Based on the WordPress/WooCommerce plugins in your screenshots, here is what's missing from the Lovable rebuild and what I'll implement in **prioritized phases**. We'll execute Phase 1 in this round (the highest-impact items needed before onboarding users), and you can approve subsequent phases as follow-ups.

---

## Mapping Your WordPress Plugins → Lovable Status

| Plugin | Purpose | Status in Lovable |
|---|---|---|
| Paystack WooCommerce | Payments | **MISSING — critical** |
| Tutor LMS | Courses/lessons/quizzes | Partial (no certificates engine, no resources) |
| HubSpot | CRM/leads | Partial (business_leads exists, no pipeline) |
| Yoast SEO | SEO meta | **MISSING** |
| Site Kit (GA4) | Analytics | Replaced with internal tracking |
| Nextend Social Login | Google sign-in | Configured but needs UI buttons |
| WP Job Manager | Job board | **MISSING entirely** |
| YITH Affiliates | Referral commissions | Done (influencer system) |
| Bit Assist | Live chat | Partial (WhatsApp FAB only) |
| Loginizer | Brute-force protection | **MISSING** |
| User Activity Log | Audit trail | Done |
| WPCode | Header/footer scripts | **MISSING** (no admin script injector) |
| Image Optimizer | Asset optimization | Handled by Vite |
| UpdraftPlus | Backups | Handled by Lovable Cloud |

---

## Phase 1 — Implement Now (Production Readiness)

### 1. Paystack Payment Integration (CRITICAL)
- New edge function `paystack-initialize` — creates payment session, returns auth URL
- New edge function `paystack-verify` — verifies transaction, creates enrollment, generates order
- New `orders` table — stores transaction reference, amount, status, course_id, user_id
- Rewrite `PaymentModal.tsx` to redirect to Paystack inline checkout (no card data collected client-side)
- Requires user to add `PAYSTACK_SECRET_KEY` secret

### 2. Course Resources & Materials
- New `course-resources` storage bucket (private, signed URLs)
- New `lesson_resources` table (lesson_id, file_url, file_name, file_size, type)
- Admin UI in `AdminCourseModules` to upload PDFs/slides/zips per lesson
- Student download UI in `CourseLearning.tsx` resources tab

### 3. Certificate Engine (real generation)
- Replace mock certificates page with actual completion-based certificates
- New `certificates` table (cert_id, user_id, course_id, issued_at, verification_code)
- Auto-issue when `enrollments.is_completed = true` (DB trigger)
- Public verification route `/verify/:code` to validate certificate authenticity
- Improve PDF generation with QR code linking to verification page

### 4. SEO Foundation (Yoast replacement)
- Install `react-helmet-async`
- Add `<SEO>` component with title, description, OG tags, Twitter cards per page
- Apply to Index, Courses, CourseDetail, Pricing, ForBusinesses
- Generate dynamic `sitemap.xml` via edge function
- Add structured data (JSON-LD) for courses

### 5. Google OAuth Sign-in Buttons
- Add "Continue with Google" button on SignIn and SignUp pages
- Wire up `supabase.auth.signInWithOAuth({ provider: 'google' })`
- (Provider must be enabled in Cloud auth settings — will surface if not)

### 6. Real Admin Dashboard Metrics
- Replace mock data in `AdminOverview` and `AdminAnalytics` with real DB queries:
  - Total revenue (sum of completed orders)
  - Active students (enrollments last 30 days)
  - Revenue by month chart
  - Top courses by enrollment
  - Recent activity feed

---

## Phase 2 — Approve Later

- **Job Board** (WP Job Manager replacement): `jobs` table, public listings page, application flow, admin job manager
- **Live Chat Widget** (Bit Assist replacement): in-app chat widget with admin inbox, replaces WhatsApp-only FAB
- **Brute-force Protection** (Loginizer): edge function tracking failed logins by IP, temporary lockouts
- **Custom Scripts Injector** (WPCode): admin UI to add header/footer scripts (GA, Meta Pixel, etc.) stored in `site_settings`
- **Email System** (transactional): wire up Lovable email infrastructure for welcome, enrollment confirmation, password reset, certificate issued
- **Live Classes Integration**: Zoom/Google Meet link scheduling per course session, calendar view for students

---

## Phase 3 — Polish

- HubSpot-style CRM pipeline view for business leads (kanban)
- Drip email campaigns for nurturing
- Course bundle/learning path checkout
- Wishlist & course recommendations
- Mobile PWA install prompt

---

## Files Created/Modified in Phase 1

**New edge functions:** `paystack-initialize`, `paystack-verify`, `generate-sitemap`
**New tables:** `orders`, `lesson_resources`, `certificates`
**New storage bucket:** `course-resources` (private)
**New components:** `src/components/SEO.tsx`, `src/pages/VerifyCertificate.tsx`
**Modified:** `PaymentModal.tsx`, `CourseLearning.tsx`, `Certificates.tsx`, `SignIn.tsx`, `SignUp.tsx`, `AdminOverview.tsx`, `AdminAnalytics.tsx`, `AdminCourseModules.tsx`, `App.tsx`, `index.html`

**Required secret:** `PAYSTACK_SECRET_KEY` (will request from you on approval)

