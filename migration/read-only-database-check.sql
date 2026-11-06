-- Run separately on source and destination and compare results.
-- Contains no user records, passwords, tokens, or scheduled command bodies.
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database_name, version() AS postgres_version;
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
SELECT count(*) AS auth_users FROM auth.users;
SELECT count(*) AS auth_identities FROM auth.identities;
SELECT id, public FROM storage.buckets ORDER BY id;
SELECT bucket_id, count(*) AS object_count FROM storage.objects GROUP BY bucket_id ORDER BY bucket_id;
SELECT extname, extversion FROM pg_extension ORDER BY extname;
-- Cron may not be installed at the destination. Check existence before querying it.
SELECT to_regclass('cron.job') IS NOT NULL AS cron_jobs_available;
COMMIT;
