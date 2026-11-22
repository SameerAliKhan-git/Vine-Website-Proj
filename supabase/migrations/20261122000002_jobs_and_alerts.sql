-- Scheduled jobs and the giving-details alert.
-- PROJECT-SPECIFIC: the Edge Function base URL below points at this project's ref.
-- If you move to a different Supabase project, change functions_base_url().

create extension if not exists pg_cron;

create or replace function public.functions_base_url()
returns text
language sql
immutable
set search_path = ''
as $$ select 'https://bkcaozczhiyxlkghtidl.supabase.co/functions/v1' $$;

-- When UPI or bank details change, ask the `notify` function to email the church.
-- The function re-reads the audit row itself, so the request carries no secret.
create or replace function public.alert_on_giving_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.table_name = 'site_config' and new.record_key = 'settings'
     and new.changed_keys && array['upiId', 'upiQrImage', 'bankAccountName', 'bankAccountNumber', 'bankIfsc', 'bankName', 'bankBranch'] then
    begin
      perform net.http_post(
        url := public.functions_base_url() || '/notify',
        body := jsonb_build_object('auditId', new.id),
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
    exception when others then
      -- Never block saving settings because an alert could not be queued.
      raise warning 'giving alert not queued: %', sqlerrm;
    end;
  end if;
  return null;
end;
$$;
create trigger audit_log_giving_alert after insert on public.audit_log
  for each row execute function public.alert_on_giving_change();

-- Pull new videos from YouTube every 20 minutes.
select cron.schedule(
  'youtube-sync',
  '*/20 * * * *',
  $$ select net.http_post(
       url := public.functions_base_url() || '/youtube-sync',
       body := '{}'::jsonb,
       headers := '{"Content-Type": "application/json"}'::jsonb) $$
);

-- Data protection: delete messages and prayer requests after the retention period
-- (Site settings → messageRetentionMonths, default 12) and old rate-limit rows.
select cron.schedule(
  'purge-old-messages',
  '15 21 * * *', -- 02:45 IST
  $$
    delete from public.messages
     where created_at < now() - make_interval(months => coalesce((
       select case when data ->> 'messageRetentionMonths' ~ '^\d{1,3}$'
                   then greatest((data ->> 'messageRetentionMonths')::int, 1) end
         from public.site_config where key = 'settings'), 12));
    delete from public.contact_attempts where at < now() - interval '1 day';
    delete from public.audit_log where at < now() - interval '2 years';
  $$
);
