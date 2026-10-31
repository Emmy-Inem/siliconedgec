# Project Architecture Rules

- Keep optional journey events consent-gated, query-free and allowlisted; aggregate signup cohorts and inactive-session endpoints on the server, and give AI only administrator-authorized counts so inferred motives never masquerade as observed outcomes.
- Generate analytics AI summaries only on explicit administrator request from server-fetched reports; categorize stored paths before AI handoff and stream the result so personal identifiers and fabricated browser counts cannot enter summaries.

- Mount one persistent AI Coach in the app shell, with course context from the shared course cache and embedded existing support chat; keep WhatsApp inside it to prevent competing floating launchers.

- Weekly database backups must upload directly to the designated SEC Website Backup folder by its stable Google Drive folder ID, because name-based folder discovery can select the wrong folder.
- Apply ordinary-copy colour normalization in global CSS with semantic surface tokens and explicit interactive-state exclusions, so pages and portal-rendered dialogs remain consistent without altering layouts or action colours.
- Keep private-route indexing policy in a shared helper used by the route head guard and SEO component, so admin and learner pages cannot accidentally inherit public metadata.
- Keep the build-time static sitemap mechanism, paginate published content queries, and preserve each unavailable source independently; never derive lastmod from generation time.
- Send Google pageviews once per navigation, excluding admin paths and sensitive query parameters, so public navigation is measurable without leaking callback or recovery data.
- Keep passive internal analytics gated before authentication and database work on preview hosts and crawlers; real submissions remain eligible so testing cannot discard genuine leads.
- Cache public settings and homepage content with explicit freshness and retention windows, with admin-save invalidation preserved, to avoid redundant reads without hiding saved changes.
- Keep course instructor identity sourced from saved assignments, not static content or randomly chosen portraits; unassigned courses stay unattributed so fallback content cannot impersonate an instructor.
- Use the shared public instructor query for the directory and profiles, with published assigned courses as teaching evidence; avoid unverified ratings and cached course totals so instructor presentation stays consistent and credible.
- Keep native wallet checkout on server-priced Checkout Elements sessions and validate session ownership, currency, totals, and the complete order set before fulfillment; verify webhook events against Stripe to prevent forged callbacks.
- Keep the audience overview on an administrator-only, date-bounded aggregate RPC; count signups from auth creation, deduplicate authenticated login sessions, and never treat unidentified historical page views as unique people.
- Record one internal view per committed public navigation with a persistent anonymous browser identifier and bounded geo lookup; suppress previews, crawlers, and sensitive URL parameters so audience metrics stay meaningful.