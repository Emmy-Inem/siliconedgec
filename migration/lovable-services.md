# Temporary Lovable services with an owned Supabase database

User choice: retain Lovable email and AI while migrating the database. This still consumes Lovable runtime credits. The connection below is prepared in source code, not activated or verified with real provider requests yet.

## Flow

Browser → owned Supabase functions → authenticated service relay on original Lovable backend → Lovable AI/email provider.

User verification, administrator permissions, course context retrieval, analytics aggregation, guest question reservations, email suppression, queues, retries and delivery records remain in the owned Supabase project. The source relay has no destination database key, database client or user auth token. Existing direct Lovable provider calls continue unchanged when relay settings are unset.

The relay permits only AI chat completions, AI Responses with storage disabled, and email from the company's exact approved sender domains. It uses a dedicated random server credential of at least 64 characters, TLS, bounded requests and constant-time credential comparison. AI streaming passes through without buffering. Provider failures are sanitized. Neither request content nor secrets are logged by the relay. Treat the relay credential as permission to consume the source project's AI and email services; keep it out of frontend configuration and version control.

## Activation sequence (pending)

1. Review and deploy `lovable-service-relay` **only to the original Lovable backend**, with `verify_jwt=false` and its explicit relay authentication. Initially it responds 503 until configured. The same repository function deployed elsewhere without provider credentials stays inert.
2. Obtain action-time approval to create the new persistent relay credential in Lovable. Generate at least 32 random bytes, encode as 64 hex characters, and store the identical value as `SEC_LOVABLE_RELAY_KEY` in source and destination secret stores. Do not export the source `LOVABLE_API_KEY`.
3. On the destination only, set `SEC_LOVABLE_RELAY_URL` to the verified original backend endpoint ending `/functions/v1/lovable-service-relay`. Do not set a relay URL on the source, which would route its existing functions unnecessarily through the relay.
4. Deploy the updated AI functions and email queue worker to the destination. All browser requests continue through destination handlers, never directly to the relay. Provider gateway keys and the relay credential stay server-side.
5. Verify rejection of missing/incorrect credentials, streaming, guest limits, administrator-only analytics, sender restrictions, idempotency and retry behavior. Check available Lovable credits and sender configuration before sending any real email.
6. Configure destination email queues and credentials separately. Existing sessions and pending source email messages must not be blindly replayed. Supabase authentication emails still need their own SMTP or auth-hook integration; enabling the transactional relay alone does not configure auth email delivery.
7. Complete final data reconciliation and frontend migration before switching the live site. Leave source runtime available while it provides these services.

Google Drive backups/calendar, Google Search Console, Apple sign-in and source-specific connector tokens are separate integrations. This relay deliberately cannot forward arbitrary URLs or connector actions. The weekly backup destination must retain the saved stable Google Drive folder ID.

## Rollback

Before production switch, leave destination relay settings unset and continue serving the original site. After activation, repair or disable only the destination connection while preserving source provider credentials. Do not switch a live backend to the older database without reconciling new writes.

## Checks completed

Six focused relay policy/configuration tests pass. The relay server bundles successfully. Full provider operation and live cutover are not yet tested.
