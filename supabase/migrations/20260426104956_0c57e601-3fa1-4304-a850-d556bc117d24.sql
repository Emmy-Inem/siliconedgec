SELECT cron.schedule(
  'backup-to-drive-weekly',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://sdddxnjlgjjaoayyraxn.supabase.co/functions/v1/backup-to-drive',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  ) AS request_id;
  $$
);