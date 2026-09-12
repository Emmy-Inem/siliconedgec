-- Unschedule and reschedule live-class-reminder-15min with secure vault secrets
DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'live-class-reminder-15min';
  IF v_jobid IS NOT NULL THEN PERFORM cron.unschedule(v_jobid); END IF;
END$$;

SELECT cron.schedule(
  'live-class-reminder-15min',
  '*/15 * * * *',
  format(
    $cron$
    SELECT net.http_post(
      url := 'https://sdddxnjlgjjaoayyraxn.supabase.co/functions/v1/live-class-reminder',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer %s'
      ),
      body := '{}'::jsonb
    );
    $cron$,
    COALESCE(
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key' LIMIT 1),
      ''
    )
  )
);
