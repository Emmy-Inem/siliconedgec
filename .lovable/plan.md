# Career page, partner dashboard, referral links & security fixes

## 1. Career page (`/career`) — full content + imagery

Currently the page is a hero, three benefit cards and a form. Expand to a real partner landing page:

- Hero with a generated stock image (African tech creator/mentor with laptop and phone, warm premium look) and clear stats strip (courses, learners, commission).
- "How it works" — 4 steps: apply, pick courses, share your link, get paid monthly.
- "Who this is for" — creators, community leads, corporate trainers, alumni (with an image).
- Commission & payout table (rate tiers, cookie window, payout schedule, Naira payouts).
- Earnings estimator (slider: referrals/month × average course price → monthly commission).
- Success/testimonial section and partner FAQ accordion.
- Final CTA + application form (kept, with course multi-select).
- SEO: title/description, single H1, alt text on all images, FAQ JSON-LD.

Images generated into `src/assets/` (hero, who-it's-for, payout/earnings visual), imported directly.

## 2. Referral links that actually land on the chosen course

Verified in the database: the one existing course selection is still `status = 'pending'` with `referral_code = NULL`, so the dashboard shows no course link and any code in circulation falls back to the site root — this is the root cause of links not reaching the course.

Fixes:
- Generate the per-course referral code at selection time (not only at approval) so the link exists immediately; approval only flips the status.
- Add a `landing_path` column to `affiliate_course_selections` so a partner can choose the destination themselves: course page (default), course checkout/enrol, pricing, bootcamp, or home. Editable in the dashboard with a live link preview.
- Build links from the selection's `landing_path` (falling back to the course slug) instead of hardcoded `/courses/{slug}`.
- `AffiliateTracker`: keep the stored code, and after resolving a course-specific code, if the visitor landed on a non-course page, do not lose the course attribution — store the resolved `course_id` alongside the code so enrolment attribution stays correct.
- Add UTM parameters to generated links for analytics.

## 3. Partner dashboard gaps

- Referral link builder: choose destination page, optional campaign tag, QR code download, and copy/share per link.
- Pending vs approved courses clearly separated, with "request more courses" inline.
- Earnings summary: this-month vs lifetime, next payout date, minimum payout threshold.
- Clicks-over-time chart and click→signup→paid conversion funnel.
- Payout details form validation (bank name, account number, account name) with a warning banner when payout details are missing.
- Notifications/empty states, mobile layout pass (tabs scroll, tables become cards), and a downloadable marketing kit (copy blocks, banner assets).

## 4. Security fixes (4 findings)

1. `assignment_submissions` — students can insert a row with `grade`/`graded_by`/`graded_at` already set. Add a WITH CHECK/trigger forcing those to NULL on insert for non-staff.
2. `quiz_attempts` — client-supplied `score` is trusted. Force scoring through the existing `grade_quiz_submission` security-definer function and block direct score writes from learners via trigger.
3. `orders` — self-insert allows arbitrary `amount`/`status`. Constrain inserts to `status = 'pending'` and let the Paystack webhook be the only path to `completed`.
4. RLS policies using `USING (true)`/`WITH CHECK (true)` on write operations — tighten each to an ownership or role check.

## Technical notes

- One migration: `landing_path` on `affiliate_course_selections`, code generation on insert, plus the four security changes (triggers/policies).
- Frontend: `src/pages/Affiliates.tsx` (career page), `src/pages/affiliate/AffiliateDashboard.tsx`, `src/components/AffiliateTracker.tsx`, `src/pages/admin/AdminAffiliates.tsx` (show/override landing path).
