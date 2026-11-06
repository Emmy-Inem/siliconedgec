# Silicon Edge Consulting migration

Source: Lovable-managed project `sdddxnjlgjjaoayyraxn`.
Destination: owned Supabase project `jhrytvbpxftwpasqdybk`.

## Current status

The destination was observed healthy in Opera. The supplied export is `C:/Users/ADMIN/Downloads/siliconedgec_261106.backup` (6,505,738 bytes), identified by its `PGDMP` header as a PostgreSQL custom archive. SHA-256: `50b0f7c80ff1a692435a8837a7ed2548b9e767f61e238769b4842df52de569e4`. Keep the private backup outside this repository.

The Supabase CLI now has access to destination project `jhrytvbpxftwpasqdybk`. The isolated destination restore has completed. The live frontend still uses the original Lovable-managed backend; no production switch or source deletion has occurred. Direct Gemini and Resend credentials are saved, with both providers explicitly inactive at the user's request; see [owned-providers.md](owned-providers.md) for readiness and activation requirements.

The custom archive was successfully read locally using `pg_restore` 17.11, including data decompression. Its table-of-contents lists 107 public table-data entries and authentication, storage metadata, cron and encrypted Vault data. Streaming data inspection counted 354 users, 357 identities, 35 courses, 409 enrollments, 54 orders, 7 storage buckets and 39 storage object metadata rows. These are export counts, not destination counts. Storage metadata does not include the actual uploaded files. Existing cron and Vault records require review rather than blind restoration.

### Verified destination restore

- Restored public schema with its RLS, functions and ACLs. Omitted permissions for the Lovable-only `sandbox_exec` role and source-managed `supabase_admin` default grants. Updated stored function endpoint references to the destination. Public schema restoration was transactional; an initial missing-role attempt rolled back before the successful retry.
- Restored all 107 public tables plus auth users, identities and MFA factors, using explicit-column inserts generated from COPY data. Suppressed triggers during restore to avoid sending emails or creating duplicate profiles. Did not transfer old sessions, refresh tokens, one-time tokens or auth service migration state.
- Verified exact export/destination row counts for all 110 selected tables: 81,679 records. Checked all 82 public foreign keys: no orphan records found. Counts and relationship checks do not substitute for final application tests.
- Restored 156 source application migration-history records separately, without replaying historical migrations.
- Restored 2 auth signup triggers and 21 storage policies.
- Deployed all 46 source backend functions; all listed ACTIVE. Stripe publishable and dedicated restricted backend keys are saved as `STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` in the destination. The existing Paystack live key was copied directly from the authenticated company dashboard to `PAYSTACK_SECRET_KEY` in Supabase, with destination UI verification. Payment keys were not rotated or expired, and source webhook URLs were not changed. The Stripe migration key uses the existing website key's permissions; the original key remains active. No real charge was made and runtime payment verification is pending. Email, AI and connector configuration remains pending.
- Created six application storage buckets with source privacy settings. Omitted the empty temporary database-export bucket. Copied all 24 public objects and verified downloaded destination content equals source bytes. Fifteen private source objects remain: one course resource and fourteen assignment submissions. Their source metadata is retained locally for the next stage; nonexistent destination files were not represented by fabricated storage metadata.
- No source cron jobs, queued email messages, session tokens or encrypted source Vault secrets were restored. Destination currently has zero scheduled jobs.

### Remaining before production switch

November 6 browser review: the current Lovable database overview displayed counts substantially different from the supplied archive (for example 63 courses and 1 enrollment, versus 35 and 409 in the archive). Overview counts may be stale, filtered or from a different backend state. Verify authoritative SQL counts and the live app's actual backend before reconciling; do not overwrite either dataset based on the overview alone.

Google client `Silicon Edge Consulting Website` in Cloud project `silicon-edge-consulting` now has the saved callback `https://jhrytvbpxftwpasqdybk.supabase.co/auth/v1/callback`, verified by reopening its settings. After explicit approval, a second client secret was created and saved directly in Supabase's Google Auth provider; provider state verified ENABLED. The original Google secret and all existing callbacks remain active. Supabase Site URL is `https://siliconedgec.com` and the saved redirect allowlist contains `https://siliconedgec.com/**`. Secret values are not stored in this repository. The frontend still calls the Lovable auth wrapper, which needs migration before the site uses the new provider. Full interactive sign-in and identity-linking checks remain pending. Calendar OAuth credentials/scopes are a separate integration and have not been configured from this new sign-in client. Paystack requires user sign-in/password recovery in Opera.

Obtain the 15 private files through authenticated source storage access; configure required external secrets and Google sign-in; recreate the required email queues and destination Vault credentials; update references to verified copied files; test a separate frontend against the destination; reconcile writes made since the November 6 export; switch webhooks and frontend together; then enable the reviewed schedules. Recheck all source and destination records before final handover. The source remains the live system of record.

## Export first

Download the database export from Lovable's database management settings. Keep it outside the repository: it may include private records and authentication password hashes. Download storage files separately. The existing weekly JSON backup is not a substitute for a complete migration export.

Run `node scripts/migration-inventory.cjs` to inspect the local source inventory. It lists migration files, function names, environment variable names, and files tied to the old project. It never reads secret values or connects to a database.

## Restore and verify before switching

1. Inspect the export format and contents before choosing a restore command. Check whether it contains schema, data, users, identities, grants and migration history. Do not blindly replay both migration folders or restore an entire archive over existing objects. Historical migrations include data changes and scheduled external requests.
2. Compare source database size and file storage against destination capacity before copying.
3. Restore into the isolated destination while preserving user IDs and relationships. Verify rows, policies, grants, triggers, functions and extensions. Use `read-only-database-check.sql` for an initial metadata comparison; its results alone do not prove data equality. Compare exact counts and critical records separately without publishing private information.
4. Copy storage objects and verify sizes/checksums and bucket privacy. Rewrite stored old-project file URLs only after copied files are verified. Inventory source cron jobs and keep destination schedules inactive until the final switch; avoid duplicate emails and payment processing.
5. Deploy the server functions with reviewed authentication configuration. Transfer required secrets through a secure channel, not committed files or chat. Keep keys only with the functions that use them. Existing source secrets do not automatically become available in the destination.
6. Configure Google and other sign-in providers, redirect URLs, email delivery and templates. Audit the Lovable cloud-auth wrapper; tokens issued by the old project cannot simply authenticate against the destination. Existing sessions will need sign-in again.
7. Review AI gateway and Drive connector dependencies separately. Keep the weekly backup target's stable Google Drive folder ID. A deliberate temporary Lovable integration needs compatible authentication and still incurs Lovable usage.
8. Test a separate frontend against the destination: sign-in, permissions, administrator access, course access, file uploads, AI Coach, cart, installment deadlines, certificates, and server-priced wallet sessions. Verify Stripe/Paystack webhook signatures and correct fulfillment without real charges.
9. Plan a brief write pause or final incremental transfer so registrations, orders and payments arriving after the first export are not lost. Account for pending provider sessions and webhook deliveries before moving webhook endpoints. Then update frontend configuration, rebuild and switch traffic. Monitor before enabling destination schedules.
10. Retain the original backend and backups for rollback. Never remove the old database as part of preparation. Rollback after new production writes requires reconciling records rather than simply pointing the frontend back.

This checklist is preparation, not a claim that the migration has completed.
