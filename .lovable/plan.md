
Fix the free-webinar and influencer-attribution flow as one end-to-end patch so registration state, dashboard visibility, paid enrollments, and admin reporting all stay in sync.

### 1) Make webinar registration identity-based and duplicate-safe
- Require sign-in before a user can register for a free webinar so every registration has a real `user_id`.
- Add a database uniqueness guard for authenticated webinar registrations:
  - partial unique index on `course_registrations (user_id, course_id, registration_type)` where `user_id is not null`
- Repair existing bad data before enforcing the index:
  - dedupe repeated webinar registrations for the same authenticated user/course
  - create missing `enrollments` rows with `payment_status = 'free'` for authenticated webinar registrations that currently have none
- Update `RegistrationFormModal.tsx` to:
  - check existing registration/enrollment before insert
  - show an “Already registered” success state instead of re-submitting
  - treat enrollment creation as required, not fire-and-forget; surface errors if it fails
  - keep the WhatsApp + dashboard confirmation UI

### 2) Fix the CTA state everywhere users see the webinar
- In `CourseDetail.tsx`, stop relying only on `enrollments` for webinar state.
- Introduce a dedicated “webinar registration status” lookup that checks both:
  - `enrollments`
  - `course_registrations`
- Use that status to:
  - show `Registered` instead of `Register for Free`
  - prevent reopening a fresh registration flow for already-registered users
  - send unauthenticated users to sign-in before registration
- In `Dashboard.tsx`, build the webinar section from the same resolved registration status so existing registrants always see the webinar card even if an enrollment row was previously missed.

### 3) Unify attribution so webinar registrations and paid enrollments both count for influencers
- Keep `lead_sources` as the raw UTM/event log, but add a real conversion record for influencer outcomes.
- Extend `influencer_referrals` to support more than paid promo purchases by adding fields such as:
  - `conversion_type` (`webinar_registration`, `paid_enrollment`, `free_enrollment`)
  - nullable link(s) to `order_id` / `registration_id`
- Add a uniqueness rule so the same user/course/conversion is not counted twice.
- Standardize attribution resolution:
  - resolve influencer from current stored UTM values
  - support short-link/promo flows and plain UTM-only flows
  - use one storage source for UTM persistence instead of split behavior
- Fix the current mismatch by standardizing the UTM helper usage across:
  - `useUtmTracking.ts`
  - `RedirectInfluencer.tsx`
  - `trackLead.ts`
  - checkout/registration flows

### 4) Make payment flows preserve and write attribution correctly
- Update `PaymentModal.tsx` and `Cart.tsx` checkout calls to send current UTM data along with checkout initialization.
- Update `paystack-initialize` and `paystack-cart-initialize` to persist attribution into order metadata and resolve a matching influencer even when no promo code was manually applied.
- Update `paystack-verify` and `paystack-cart-verify` to:
  - create or upsert the correct influencer conversion row
  - mark it as `paid_enrollment`
  - avoid duplicate referral writes on repeated verification calls
- Keep paid enrollments, receipts, and audit logging intact.

### 5) Update admin views so attribution is visible in the right places
- `AdminInfluencerMarketing.tsx`
  - show separate counts for webinar registrations vs paid enrollments
  - include attributed webinar registrations in the referral log
  - make leaderboard metrics reflect real conversions, not only promo-code purchases
- `AdminRegistrations.tsx`
  - display attribution columns/badges (influencer / source / campaign) for webinar registrations
- `AdminOrders.tsx`
  - show attribution details for paid orders when present
- `AdminLeadsHub.tsx`, `AdminMarketingAnalytics.tsx`, `AdminOverview.tsx`, `AdminAnalytics.tsx`
  - use standardized conversion data so webinar registrations and paid enrollments reflect properly in totals and reports

### 6) Clean up the supporting code paths
- Standardize `trackLead` payload shapes (`course_id` instead of mixed `courseId` / `course_id`) so downstream reporting can join data reliably.
- Stop clearing pending influencer attribution too early; keep it until a successful registration or checkout consumes it.
- Add defensive cache invalidation after webinar registration so course detail and dashboard update immediately.

### Files involved
- Frontend:
  - `src/components/RegistrationFormModal.tsx`
  - `src/pages/CourseDetail.tsx`
  - `src/pages/Dashboard.tsx`
  - `src/lib/track-lead.ts`
  - `src/hooks/useUtmTracking.ts`
  - `src/pages/RedirectInfluencer.tsx`
  - `src/components/PaymentModal.tsx`
  - `src/pages/Cart.tsx`
  - `src/pages/admin/AdminInfluencerMarketing.tsx`
  - `src/pages/admin/AdminRegistrations.tsx`
  - `src/pages/admin/AdminLeadsHub.tsx`
  - `src/pages/admin/AdminMarketingAnalytics.tsx`
  - `src/pages/admin/AdminOverview.tsx`
  - `src/pages/admin/AdminAnalytics.tsx`
- Backend:
  - `supabase/functions/paystack-initialize/index.ts`
  - `supabase/functions/paystack-cart-initialize/index.ts`
  - `supabase/functions/paystack-verify/index.ts`
  - `supabase/functions/paystack-cart-verify/index.ts`
- Database:
  - migration for uniqueness + influencer conversion fields + duplicate-safe indexes
  - data repair for existing webinar registrations and missing enrollments

### Ready-for-launch acceptance checks
- A signed-in user cannot register the same free webinar twice.
- After first registration, the course page shows `Registered` immediately.
- The webinar appears in the dashboard for that user.
- A webinar registration from an influencer UTM link increments that influencer’s registration count in admin.
- A paid enrollment from an influencer UTM link increments that influencer’s paid conversion metrics in admin.
- Re-running payment verification does not create duplicate influencer/referral records.
