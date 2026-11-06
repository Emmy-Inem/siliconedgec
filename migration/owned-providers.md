# Direct Gemini and Resend preparation

Status, 6 November 2026: user requested direct provider accounts, then chose to leave Gemini inactive and pause Resend. The production site still uses the original backend. No billing, DNS, SMTP, webhook or production database switch was made in this step.

## Saved in the owned Supabase project

Destination: `jhrytvbpxftwpasqdybk`.

- `GEMINI_API_KEY`: existing Google AI Studio key, saved server-side.
- `RESEND_API_KEY`: sending-only key named Silicon Edge Supabase Email, saved server-side. Currently all domains; restrict to siliconedgec.com after verification when supported.
- `GEMINI_ENABLED=false` and `RESEND_ENABLED=false`: explicit activation switches. Saving keys alone does not route requests to either provider.
- `GEMINI_MODEL=gemini-2.5-flash`: prepared default, not yet verified with a real provider generation. Override after checking availability and quota in this account.
- `RESEND_FROM=Silicon Edge Consulting <info@siliconedgec.com>`: prepared sender; domain verification remains pending.

No credential values are committed. If no activation switch is set, the existing Lovable provider/optional relay behavior remains unchanged. An enabled provider with a missing key fails closed rather than silently routing private content elsewhere. Email never uses the Gemini credential.

The 13 AI functions map their existing Lovable model names to GEMINI_MODEL only when enabled. Chat, JSON, tool calls and streaming use Google's OpenAI-compatible chat endpoint. Administrator analytics retains authentication, aggregate server-fetched evidence and text streaming; its Gemini path uses Chat Completions rather than the unsupported Responses endpoint and omits Lovable tracing headers. The source Lovable Responses path stays available.

Resend dispatch keeps the existing queue retry contract and database duplicate checks. It sends Idempotency-Key and only message fields, leaving queue identifiers and internal metadata local. Existing HTML/text, including unsubscribe links, are preserved. Sender comes from server configuration and must use the verified company root domain. Provider errors retain status/retry information without echoing response bodies.

## Before enabling

1. Google requires Paid Services for API clients serving EEA, Swiss or UK users, and prohibits sensitive/confidential/personal information on Unpaid Services. This site is international and some learner tools use profile data. Confirm a billing-enabled project and applicable data terms before activating Gemini. Do not enable billing automatically. See https://ai.google.dev/gemini-api/terms.
2. Test a nonpersonal generation, streamed response, quiz tool call, JSON response and admin summary on the destination. Verify this key's model availability and current quotas. Then activate GEMINI_ENABLED only with the user's go-ahead.
3. Resend domain `siliconedgec.com` was added in Ireland, receiving disabled. Add the exact records currently displayed by Resend through the actual DNS provider, checking for existing records first. Nameservers are ns-cloud-b1/b2/b3/b4.googledomains.com; this alone does not identify which account controls DNS. Preserve website/mail records and existing DMARC policy. The domain is NOT yet verified.
4. Verify the domain; scope the sending key if the dashboard permits. Configure Supabase Auth custom SMTP separately: smtp.resend.com, port 465 or 587, username resend, API key as password, company sender. Do not enable SMTP until domain verification succeeds. Review existing auth email hooks/templates to avoid duplicate delivery. See https://resend.com/docs/send-with-smtp.
5. Test transactional delivery and authentication delivery using an approved recipient. Set RESEND_ENABLED=true only after this preparation. The key alone does not activate sending. Configure the queue's own service authentication and retry heartbeat in the destination; those source vault credentials/schedules were deliberately not copied. Supabase SMTP does not consume this application queue.
6. Free quotas are limited and may change. Check the account's actual daily/monthly email and AI limits before launch. Never replay the source email queue or enable schedules against the restored snapshot before reconciliation.

## GitHub and two databases

GitHub can carry application code, versioned schema migrations and deliberately authored course-content SQL. It does not replicate dashboard edits or rows between projects. A course created in either database stays there until explicitly transferred; registrations, orders, balances and progress are separate live records.

Prefer one authoritative production database. Continue code development in Lovable/GitHub while the deployed app uses the owned Supabase endpoint after cutover. Keep the old project as a rollback snapshot rather than promising automatic failover or two-way replication. If both must receive a course edit during transition, use stable course IDs and a reviewed, idempotent content migration applied deliberately to each, accounting for related modules and lessons. Never copy full course tables over newer production records.

There is no automatic dual-database deployment workflow in this repository. Do not blindly run all historical migrations: the restored migration history and newer source state must first be reconciled. The source UI/archive count discrepancy in README.md remains unresolved. A final data sync/write pause, new authentication flow, storage decision and payment webhook verification are still required before production cutover.
