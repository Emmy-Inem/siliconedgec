SELECT cron.unschedule('backup-to-drive-weekly');
SELECT cron.schedule(
  'backup-to-drive-weekly',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://sdddxnjlgjjaoayyraxn.supabase.co/functions/v1/backup-to-drive',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZGR4bmpsZ2pqYW9heXlyYXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzY3MjMsImV4cCI6MjA4ODU1MjcyM30.sR14_CsbMhO3uX-7GYl12FZd2fDcj80smnoK4tE4IVI"}'::jsonb,
    body := '{"triggered_by":"cron"}'::jsonb
  ) AS request_id;
  $$
);