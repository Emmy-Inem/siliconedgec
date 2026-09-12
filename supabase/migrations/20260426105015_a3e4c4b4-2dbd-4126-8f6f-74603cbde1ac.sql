SELECT cron.unschedule('backup-to-drive-weekly');
SELECT cron.schedule(
  'backup-to-drive-weekly',
  '0 2 * * 0',
  format(
    $job$
    SELECT net.http_post(
      url := 'https://sdddxnjlgjjaoayyraxn.supabase.co/functions/v1/backup-to-drive',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer %s'
      ),
      body := '{"triggered_by":"cron"}'::jsonb
    );
    $job$,
    COALESCE(
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key' LIMIT 1),
      ''
    )
  )
);