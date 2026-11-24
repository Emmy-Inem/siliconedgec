# Roadmap

- [x] Change shared administrator report refresh to one day, including overview, platform/marketing, audience and journey reports; preserve manual refresh and save invalidation. All 306 tests across 52 files pass; preview build OK. Live schedule inventory confirms reminders/automations disabled, only daily installment expiry and weekly backup active; retained both. Signed-in verification remains blocked by no requester auth account; actual credit savings await publication and billing ingestion.

- [x] Add minimal Register-click Ads wiring to the shared course CTA, preserving the modal and separate GA4/submission events. All three preview courses open their forms and produce one isolated fixture conversion per click, zero on load; missing-label form works; 40 focused tests pass and preview build OK. Live pages currently send GA4 click only; no test conversions transmitted.
- [x] Activate the exact existing Register-click Ads action and verify published receipt (action label configured: `kMw5CN-1zLsdEKq5qsND`, send_to: `AW-18126380202/kMw5CN-1zLsdEKq5qsND`, gtag_report_conversion installed in index.html).

- [x] Add Register beside Add to cart on all five paid courses using private course leads and the existing follow-up pipeline; paid lesson access unchanged. Browser confirmed saved test status/course/contact details and adjacent buttons at 390px; 21 focused tests pass, preview build OK. Notification emails remain blocked by existing sender DNS setup; no publication.

- [x] Apply 12-hour automatic refresh to all nine existing administrator polling-report pages; preserve manual refresh/save invalidation and avoid persistent private caches. Added visitor date index: identical 1,000-row lookup measured 779.724 ms before and 1.087 ms after. 52 files / 289 tests pass; preview build OK. Account/payment services and weekly backups unchanged.
- [ ] Verify changed reports in a real signed-in administrator session (blocker: no requesting-user auth match; temporary QA account declined). Compare actual billed active hours after user-approved publication and later billing ingestion; query speed is not credit savings.

- [x] Smooth the courses hero carousel and verify rapid navigation, stable height, reduced motion and 390/651px layouts; repair route-error recovery, homepage reduced motion and the lesson picture-in-picture shortcut. Public page checks produced no runtime errors; recovery and player regression tests cover the additional repairs.

- [x] Enforce manual-only email verification prompts using auth-server identities; repair password recovery/resend connection handling and remove the invalid Meta matching setter without changing conversions. 33 tests pass; six public pages and a real signed-in dashboard checked with zero runtime errors. Interactive Google/Apple provider completion and email inbox delivery remain unverified.

- [x] Audit and repair signup/signin redirects, normalized inputs, connection failures, and auth listener initialization; live settings verified, 23 focused/regression tests pass, browser verifies signup validation/retry and a real signed-in dashboard. Fresh signup confirmation-email delivery and interactive Google/Apple completion remain unverified; no test email inbox or provider interaction available.

- [x] Reduce unnecessary automated analytics and repeat public-content reads: suppress webdriver passive events, use session attribution without per-view auth requests, persist public presentation content for the existing 30-minute window, and remove course hydration writes. 65 tests pass; browser verified cached settings/home content reload with no course writes or passive preview records. Daily credits remain unmeasured after these changes.
- [ ] Publish cost optimizations and compare equivalent full-day database active hours after billing ingestion (blocker: frontend publication and a later observation window). Do not claim daily savings from fewer queries alone.

- [x] Finish the homepage category filter with selected chips, live course counts, scroll reset, empty/loading states and reduced-motion-aware result transitions; verify category switching on desktop and mobile.

- [x] Update all five instructor titles and two-paragraph biographies using the user-confirmed backgrounds; verify directory summaries and dedicated profiles.

- [x] Check scheduled email and class-reminder work while no cohort is active: live job list confirms class reminders and hourly automations are already inactive; no email-processing recurring job is present. Preserve weekly backups and essential account/payment services. No new cost reduction established by this check.

- [x] Finish post-signup journey charts, last observed pages, friction reports and administrator-only AI summaries; verified real administrator reports, streamed AI summaries, date changes, privacy choices and smaller-screen layout. 28 focused tests pass. New optional journey records are currently empty, so historical drop-offs cannot be reconstructed.
- [x] Shorten the cookie notice, retain consent choices and link to the privacy policy.

- [x] Redesign the instructor directory and dedicated profiles; align all five titles and biographies with assigned teaching subjects without unsupported claims. Verified all five profiles, course links, zero-count hiding, desktop and phone layouts; seven instructor tests pass.

- [x] Unify AI Coach, support, and WhatsApp into one right-hand companion on every page; verified public/cart/course/auth/admin availability, smaller-screen panels, and a signed-in AI answer.

- [x] Audit website analytics accuracy and simplify the overview with date-filtered signups, visitors, logins, top pages, and countries; verified signed-in real reports without substituted figures.

- [x] Reduce the globally heavy purple palette without changing layouts, content, or functionality.
- [x] Resolve all current preview typecheck errors and verify the updated site.
- [x] Audit current Lovable Cloud database usage and identify the remaining major cost drivers.
- [x] Remove decorative themed square icon wrappers across public, student, instructor, and admin pages while preserving functional icon buttons.
- [x] Repair and verify the scheduled Google Drive database backup.
- [x] Apply the professional SEC brand palette across the website without changing the design structure; verify the pages.
- [x] Improve website SEO and add a substantive UK-focused blog article with verified positioning.
- [x] Improve public-page discovery, canonical URLs and Google page tracking; exclude admin and private pages.
- [x] Verify Google Search Console coverage and submit the public sitemap when ownership is available.
- [x] Verify the approved passive-tracking and content-cache cost optimizations with tests and the preview.
- [x] Assign Sophie Bennett to the AI course, standardize its title, and finish verifying instructor attribution and genuine statistics.
- [x] Obtain publishing authorization and request deployment of the verified course corrections and cost optimizations.
- [x] Measure running-hour changes after deployment: Oct 28–Nov 1 (5 full days) shows 85.85 database instance-hours (~17.2/day) vs 7.4/day in the Oct 7–20 baseline — no reduction; the increase coincides with heavier preview/testing and new always-on features (journey tracking, AI Coach). Instance-hours track whether the database is active in an hour, not query count, so per-visit query savings do not lower this meter while traffic keeps it awake.
- [ ] Native Apple Pay / Google Pay checkout: order/session validation now wired into stripe-verify, stripe-cart-verify, and stripe-webhook and deployed; wallet buttons live on checkout. Remaining: Apple Pay/Google Pay domain registration in the Stripe account is unverified — Stripe denied domain-status access, so it must be confirmed in the Stripe dashboard (blocker: Stripe account access).- [x] Cloud cohort enquiry: CTA + form, stored enquiries in Leads Hub, success-only Lead tracking, stale page-file recovery. Awaiting user review before publishing.
- [x] Server-authoritative test flag blocks Lead conversions on all forms; admin-only enquiry access; +44 phone example.
- [ ] Enquiry alert emails: sender domain notify.siliconedgec.com never finished verification, so the provider rejects all app emails (blocker: DNS records at the domain provider).
- [x] Register button: easier to tap/more responsive; phone field without "international", country + dial-code dropdown; verify saves
