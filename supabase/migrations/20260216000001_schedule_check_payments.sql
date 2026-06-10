-- Enable the pg_cron extension
create extension if not exists pg_cron with schema extensions;

-- Schedule the check-payments function to run every day at 9:00 AM UTC
-- Note: Replace 'http://host.docker.internal:54321' with your API URL in production
-- In Supabase Cloud, this would actally be better handled via UI, but here is the SQL way using pg_net
-- We assume pg_net is enabled.

select
  cron.schedule(
    'invoke-check-payments-daily',
    '0 9 * * *',
    $$
    select
      net.http_post(
          url:='https://[PROJECT_REF].supabase.co/functions/v1/check-payments',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );
