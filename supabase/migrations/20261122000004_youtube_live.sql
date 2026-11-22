-- Automatic YouTube live detection.
-- The youtube-sync function now also reads the channel's /live page and stores
-- { status: live | upcoming | none, videoId, title, startsAt, checkedAt } under
-- site_config 'youtube' -> 'live'. get_site() already returns that row, so the website
-- switches to the live player on its own (no admin action needed).

-- Message library: refresh every 10 minutes (was 20).
select cron.unschedule('youtube-sync') where exists (select 1 from cron.job where jobname = 'youtube-sync');
select cron.schedule(
  'youtube-sync',
  '*/10 * * * *',
  $$ select net.http_post(
       url := public.functions_base_url() || '/youtube-sync',
       body := '{}'::jsonb,
       headers := '{"Content-Type": "application/json"}'::jsonb) $$
);

-- Live status: every minute.
select cron.unschedule('youtube-live') where exists (select 1 from cron.job where jobname = 'youtube-live');
select cron.schedule(
  'youtube-live',
  '* * * * *',
  $$ select net.http_post(
       url := public.functions_base_url() || '/youtube-sync',
       body := '{"mode": "live"}'::jsonb,
       headers := '{"Content-Type": "application/json"}'::jsonb) $$
);
