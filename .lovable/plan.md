
# Fix Admin Analytics Inconsistencies

## What's wrong today (verified against the live database)

The admin dashboard pulls the same underlying tables (`enrollments`, `lead_sources`, `course_registrations`, `business_leads`, `orders`, `profiles`, `cart_items`) from many different screens, each with **slightly different rules**. The result: the same metric reads differently depending on which page you open. There is also genuine **double-counting** because every webinar registration auto-creates a `free` enrollment row.

DB sample (now): 72 enrollments, ALL `payment_status='free'`; 71 webinar registrations; 5,149 `pageview` + 1,479 `page_visit` rows; 0 paid enrollments yet.

### Inconsistencies found

1. **Webinar registrations are double-counted as enrollments.** Every `course_registrations` row triggers a matching `enrollments` row with `payment_status='free'`. Leads Hub adds them together (`stats.total = registrations + enrollments + business`), so today's "143 total leads" is really ~71 unique people.
2. **Hidden 1000-row cap.** Overview, Platform Analytics, Marketing Analytics, and Leads Hub use `fetchAllRows`, but **AdminEnrollments, AdminOrders, AdminBusinessLeads, AdminStudents, AdminCartAbandonment, AdminWishlistInsights, AdminCourseHealth, AdminUserActivity, AdminInfluencerMarketing, AdminTrackingQA, AdminAuthReplay** all use the default PostgREST cap (1000) or hard-coded `.limit(2000–5000)`. Once data crosses that line totals silently diverge.
3. **`payment_status` semantics drift.** Analytics treats `paid` and `confirmed` as paid; AdminEnrollments badge only colors `paid` (so `confirmed` shows yellow/pending); AdminEnrollments edit dropdown is missing `confirmed` and `free`; `send-bulk-announcement` filters on `["paid","confirmed"]`.
4. **No tracking event when a paid enrollment happens.** Paystack functions write to `enrollments`/`orders` but never `trackLead`. So `courseRegs` in Marketing Analytics is permanently 0 even after real purchases, and conversion rate is wrong.
5. **`page_visit` vs `pageview` confusion.** UtmTracker writes `page_visit` only when a UTM is present and `pageview` otherwise. Some screens count one, some count both — Marketing Analytics counts both for `Page Visits` but classifies neither as a conversion (correct), while older code paths still treat `page_visit` as a "lead". Needs one canonical rule.
6. **Influencer referrals can double-count.** `auto_record_influencer_referral` (free) and `auto_record_influencer_referral_order` (paid) both write to `influencer_referrals`. If the same person webinar-registers and later buys, they appear as two referrals for the same promo. Conversion counts on AdminInfluencerMarketing inherit this.
7. **Recent Enrollments on Overview** uses `slice(0, 5)` on a list ordered by `fetchAllRows` default (desc by created_at) — fine — but mixes free webinar rows in with "Recent Enrollments", confusing course vs webinar activity.
8. **Channel attribution coverage**: `AdminLeadsHub` joins lead_sources by email or user_id but enrollments rows have no email — only `user_id`. For paid checkouts where the order carries no UTM stamp, attribution is lost. The trigger uses 30-day window for paid, 90 for free — inconsistent.

## What we'll change

### A. Single source of truth helpers (`src/lib/analytics-helpers.ts`, new)
- `isPaidEnrollment(e)` → `payment_status in ['paid','confirmed']`.
- `isFreeEnrollment(e)` → `payment_status === 'free'` (i.e. webinar shadow row).
- `isWebinarFormType(ft)` / `isCourseConversionFormType(ft)`.
- `dedupeLeads({ registrations, enrollments, businessLeads })` → returns unified leads where a registration + its matching free enrollment count as ONE lead (matched by `user_id` + `course_id`).
- Every dashboard imports from here. No more inline rules.

### B. Pagination consistency
Replace `.select("*").limit(...)` and unbounded queries with `fetchAllRows` in: AdminEnrollments, AdminOrders, AdminBusinessLeads, AdminStudents, AdminCartAbandonment, AdminWishlistInsights, AdminCourseHealth, AdminUserActivity, AdminInfluencerMarketing (`promo_codes`, `influencer_referrals`), AdminTrackingQA, AdminAuthReplay.

### C. Stop double-counting in Leads Hub
- Total = unique people (dedupe registration ↔ free enrollment).
- KPI cards: "Webinars", "Paid Enrollments" (only `paid|confirmed`), "B2B" — never sum free+webinar.
- Channel breakdown computed on deduped set.

### D. Fix Overview & Platform Analytics labelling
- "Recent Enrollments" filters to paid only; add a separate "Recent Webinar Registrations" tile.
- KPI subtitles clarify "incl. webinar shadow rows" → just remove that confusing total and show paid + webinar separately.
- Rename internal `totalRevenue: paidEnrollments.length` to `paidEnrollmentsCount` (it's a count, not money).

### E. Track paid conversions properly
- Add `trackLead({ formType: 'paid_enrollment', formData: { course_id, order_ref, amount } })` calls to `paystack-verify` and `paystack-cart-verify` callback flow on the client side (`Cart.tsx` / enroll callback). Server-side functions already write the enrollment; we add the lead_sources event from the success page so attribution joins correctly.
- Marketing Analytics `courseRegs` then reflects real purchases.

### F. AdminEnrollments UX
- Add `confirmed` and `free` to the status dropdown.
- Color `paid` AND `confirmed` green; `free` blue (webinar); `refunded` red; `pending` amber.
- Show a small "webinar" badge when status=free.

### G. Influencer referrals dedupe
- On `AdminInfluencerMarketing` stats, show `unique_referrals = distinct (user_id, course_id)` so a webinar→paid upgrade doesn't double-count.
- Keep raw rows visible in the referrals table.

### H. Single page-view rule
- Marketing Analytics: `Page Visits` = `pageview ∪ page_visit` (already correct) — document via tooltip.
- Conversion rate denominator = unique sessions (best effort: distinct `user_id` + anonymous id); numerator = deduped paid_enrollment + webinar_registration. Same rule everywhere.

### I. Verification
After edits, query the DB with `psql` to confirm: Overview total users == Analytics total users, Leads Hub paid count == Analytics paid count, Marketing Analytics totalVisits == sum of timeline visits.

## Files to touch

- **New**: `src/lib/analytics-helpers.ts`
- **Edit (logic + pagination)**: `src/pages/admin/AdminOverview.tsx`, `AdminAnalytics.tsx`, `AdminMarketingAnalytics.tsx`, `AdminLeadsHub.tsx`, `AdminEnrollments.tsx`, `AdminOrders.tsx`, `AdminBusinessLeads.tsx`, `AdminStudents.tsx`, `AdminCartAbandonment.tsx`, `AdminWishlistInsights.tsx`, `AdminCourseHealth.tsx`, `AdminUserActivity.tsx`, `AdminInfluencerMarketing.tsx`, `AdminTrackingQA.tsx`, `AdminAuthReplay.tsx`
- **Edit (track paid conversions)**: `src/pages/Cart.tsx` (post-verify), `src/pages/CourseDetail.tsx` enroll callback (wherever paystack-verify is called)

## Out of scope

- No database schema changes.
- No new tables or RLS policies.
- No changes to GA4 / Meta Pixel / Paystack server-side logic — only client-side `trackLead` additions for paid conversions.
- Visual chart styling stays the same; only the numbers and labels they show are corrected.
