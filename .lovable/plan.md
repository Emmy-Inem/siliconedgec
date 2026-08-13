# Email automations + Career/Partner program fixes

## What's actually broken (verified)

- The automation queue has **never processed a single event** — `automation_events` is empty and only 3 emails exist in the delivery log. Triggers exist for enrolment, first lesson, certificate, cohort access and assignment grading, but nothing covers cart, purchase, lesson unlock, welcome or partner events.
- **Partner commissions never accrue.** Nothing in the app or database ever creates a row in `affiliate_referrals` (0 rows, and no function or trigger writes to it). Clicks are tracked but a referred purchase produces no referral, no commission, and therefore no payout — the earnings side of the partner dashboard is zero by design.
- **Currency is inconsistent.** The Career page was moved to USD, but the partner dashboard still formats every figure with the Naira helper, so the same partner sees dollars on the landing page and Naira in their dashboard.
- Partners get **no email at any stage** — application received, approved/declined, course approved, first conversion, payout requested/paid.

## 1. Email automations

New and expanded automations feeding the existing branded email queue:

Commerce
- Course added to cart (one nudge per course)
- Cart abandoned after 24h (max one reminder)
- Purchase successful — receipt with order details and a start-learning link
- Payment failed / order left pending
- Installment reminder before due date, and warning before access expiry

Learning
- Welcome email on signup
- New lesson unlocked
- New assignment or quiz published for your cohort
- Assignment graded (exists) plus due-soon reminder
- Inactivity nudge (no lesson opened in 7 days)
- Course completion and certificate ready (exists)
- Live session reminders (24h and 1h before)

Partner program
- Application received; application approved or declined
- Course selection approved
- First referral click, first conversion, monthly earnings summary
- Payout requested, payout paid

Support and account
- Ticket created, replied to, escalated to a human, resolved
- Newsletter confirm/unsubscribe (already in place)

Every automation goes through the existing queue and branded template with a dedupe key so retries never double-send, and each is individually switchable from a new **Automations** admin panel showing on/off state, last send and failure count.

## 2. Fix the pipeline itself

- Confirm the queue drainer runs on schedule, surface its last run in the admin panel, and re-schedule it if it has stalled.
- Log every send attempt with category, template and failure reason so silent failures become visible.
- Add a per-automation "send test email" action for admins.

## 3. Referral attribution (the core partner fix)

- Store the referral code and referred course on the order at checkout, and create the referral record automatically when payment is confirmed, with commission computed from the partner's rate.
- Backfill referral records for past paid orders that carried a referral code.
- Move referrals from pending to confirmed after the refund window so payouts only draw on confirmed commission.
- Drive the dashboard clicks → signups → paid funnel from this real data.

## 4. Career page and partner dashboard consistency

- One currency everywhere: dashboard, estimator, payout amounts and admin views all use the Career page's USD formatting, with the payout section stating the settlement currency.
- Career page: fix remaining copy and currency mismatches, make the stats strip pull real numbers (courses, partners, commission rate) instead of static text, and confirm alt text and FAQ structured data.
- Dashboard: real conversion funnel, this-month vs lifetime earnings, next payout date, minimum threshold in the same currency, clear pending vs approved course links with an inline request for more, payout-details validation with a blocking warning, and a mobile pass turning tables into cards.
- Admin: approve or decline partners and course selections with the matching email firing, plus a payouts queue moving requested → approved → paid.

## Technical notes

- One migration: new automation keys and triggers (cart, order paid, lesson unlock, assessment published, support ticket, affiliate lifecycle), the referral-creation function and backfill, referral status transition, and an automation settings table for the admin toggles.
- Edge functions: extend `run-automations` with the new template builders; extend the Paystack verify/webhook functions to persist the referral code and create referrals; add a scheduled job for cart abandonment, inactivity and due-date reminders.
- Frontend: `src/pages/affiliate/AffiliateDashboard.tsx` (currency, funnel, mobile), `src/pages/Affiliates.tsx` (copy, live stats, SEO), `src/pages/admin/AdminAffiliates.tsx` (payout queue), a new admin Automations page, and cart/checkout call sites for referral capture.