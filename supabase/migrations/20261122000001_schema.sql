-- The Vine Cell Church website: core schema.
-- Everything the public site shows is world-readable; every write requires an admin
-- (and, for admins who have enrolled two-factor authentication, an MFA-verified session).

create extension if not exists pg_net with schema extensions;

/* ------------------------------------------------------------------ admins */

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
     and (
       coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
       or not exists (
         select 1 from auth.mfa_factors f
         where f.user_id = auth.uid() and f.status = 'verified'
       )
     );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "Admins can see the admin list; users can see their own row"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Run from the SQL editor:  select public.grant_admin('pastor@example.com');
create or replace function public.grant_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(btrim(p_email));
  if v_id is null then
    raise exception 'No user with email %. Invite them first in Authentication → Users.', p_email;
  end if;
  insert into public.admins (user_id, email) values (v_id, lower(btrim(p_email)))
  on conflict (user_id) do nothing;
  return 'Admin access granted to ' || p_email;
end;
$$;

create or replace function public.revoke_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.admins where lower(email) = lower(btrim(p_email));
  return 'Admin access removed for ' || p_email;
end;
$$;
revoke all on function public.grant_admin(text) from public, anon, authenticated;
revoke all on function public.revoke_admin(text) from public, anon, authenticated;

/* -------------------------------------------------------------- validation */

-- Only http(s) links or same-site paths may be saved into any field that ends up in
-- an href/src/CSS url(). This blocks javascript:, data: and quote-breaking values.
create or replace function public.clean_url(p_value text, p_key text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := btrim(coalesce(p_value, ''));
begin
  if v = '' then
    return '';
  end if;

  if p_key = 'mapEmbedUrl' then
    -- Admins are told they can paste the whole <iframe> snippet: keep only its src.
    if v ~* '<iframe' then
      v := replace(coalesce(substring(v from 'src="([^"]+)"'), ''), '&amp;', '&');
    end if;
    if v !~* '^https://(www\.|maps\.)?google\.[a-z.]{2,10}/maps(/embed)?\?[^\s"''<>\\]*$' then
      raise exception 'The map must be a Google Maps embed (Share → Embed a map → Copy HTML).'
        using errcode = '22023';
    end if;
    return v;
  end if;

  if v ~* '^https?://[^\s"''<>\\]+$' or v ~ '^/([^/\s"''<>\\][^\s"''<>\\]*)?$' then
    return v;
  end if;

  raise exception 'The "%" field must be a web link starting with https:// (or a page on this site starting with /).', p_key
    using errcode = '22023';
end;
$$;

create or replace function public.clean_data(p_data jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  k text;
  v_data jsonb := coalesce(p_data, '{}'::jsonb);
begin
  if jsonb_typeof(v_data) <> 'object' then
    raise exception 'Invalid data.' using errcode = '22023';
  end if;
  if pg_column_size(v_data) > 200000 then
    raise exception 'That entry is too large.' using errcode = '22023';
  end if;
  foreach k in array array[
    'image', 'photo', 'registrationUrl', 'streamUrl', 'videoUrl', 'logoUrl', 'heroImage',
    'upiQrImage', 'mapEmbedUrl', 'mapDirectionsUrl', 'youtubeUrl', 'instagramUrl',
    'facebookUrl', 'announcementLink'
  ] loop
    if v_data ? k then
      if jsonb_typeof(v_data -> k) = 'string' then
        v_data := jsonb_set(v_data, array[k], to_jsonb(public.clean_url(v_data ->> k, k)));
      elsif jsonb_typeof(v_data -> k) <> 'null' then
        raise exception 'Invalid value for %.', k using errcode = '22023';
      end if;
    end if;
  end loop;
  return v_data - 'id';
end;
$$;

/* ------------------------------------------------- settings / live / youtube */

create table public.site_config (
  key text primary key check (key in ('settings', 'live', 'youtube')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_config enable row level security;

create or replace function public.site_config_before()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.key in ('settings', 'live') then
    new.data := public.clean_data(new.data);
  end if;
  if new.key = 'settings' and coalesce(btrim(new.data ->> 'name'), '') = '' then
    raise exception 'Please enter the church name.' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger site_config_before before insert or update on public.site_config
  for each row execute function public.site_config_before();

create policy "Anyone can read site config" on public.site_config
  for select to anon, authenticated using (true);
create policy "Admins can update settings and live status" on public.site_config
  for update to authenticated
  using (key in ('settings', 'live') and (select public.is_admin()))
  with check (key in ('settings', 'live') and (select public.is_admin()));

/* ------------------------------------------------------------ content items */

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  collection text not null
    check (collection in ('sessions', 'activities', 'sermons', 'gallery', 'ministries', 'leaders')),
  position integer,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_items_collection_idx on public.content_items (collection, position, created_at desc);
alter table public.content_items enable row level security;

create or replace function public.content_items_before()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.data := public.clean_data(new.data);
  if tg_op = 'INSERT' and new.position is null then
    select coalesce(min(c.position), 0) - 1 into new.position
    from public.content_items c where c.collection = new.collection;
  end if;
  if new.collection = 'leaders' then
    if coalesce(btrim(new.data ->> 'name'), '') = '' then
      raise exception 'Please add a name.' using errcode = '22023';
    end if;
  elsif coalesce(btrim(new.data ->> 'title'), '') = '' then
    raise exception 'Please add a title.' using errcode = '22023';
  end if;
  if new.collection = 'sessions' and coalesce(new.data ->> 'startsAt', '') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}' then
    raise exception 'Please choose a date and start time.' using errcode = '22023';
  end if;
  if new.collection = 'gallery' and coalesce(new.data ->> 'image', '') = '' then
    raise exception 'Please upload a photo.' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger content_items_before before insert or update on public.content_items
  for each row execute function public.content_items_before();

create policy "Anyone can read content" on public.content_items
  for select to anon, authenticated using (true);
create policy "Admins can add content" on public.content_items
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can edit content" on public.content_items
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete content" on public.content_items
  for delete to authenticated using ((select public.is_admin()));

/* ----------------------------------------------------------- youtube cache */

create table public.youtube_videos (
  video_id text primary key,
  title text not null,
  description text,
  published_at timestamptz,
  thumbnail text,
  source_key text not null,
  fetched_at timestamptz not null default now()
);
create index youtube_videos_source_idx on public.youtube_videos (source_key, published_at desc);
alter table public.youtube_videos enable row level security;
create policy "Anyone can read YouTube videos" on public.youtube_videos
  for select to anon, authenticated using (true);
-- Written only by the youtube-sync Edge Function (service role).

/* --------------------------------------------------- messages & prayer */

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('contact', 'prayer')),
  name text not null check (char_length(name) between 1 and 120),
  email text check (char_length(email) <= 200),
  phone text check (char_length(phone) <= 40),
  message text not null check (char_length(message) between 1 and 4000),
  consent boolean not null default false,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_created_idx on public.messages (created_at desc);
alter table public.messages enable row level security;

-- Inserted only by the `contact` Edge Function (spam checks, rate limit, Turnstile).
revoke insert, update on public.messages from anon, authenticated;
grant update (read) on public.messages to authenticated;

create policy "Admins can read messages" on public.messages
  for select to authenticated using ((select public.is_admin()));
create policy "Admins can mark messages read" on public.messages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete messages" on public.messages
  for delete to authenticated using ((select public.is_admin()));

create table public.contact_attempts (
  ip_hash text not null,
  at timestamptz not null default now()
);
create index contact_attempts_idx on public.contact_attempts (ip_hash, at desc);
alter table public.contact_attempts enable row level security;
revoke all on public.contact_attempts from anon, authenticated;

/* ---------------------------------------------------------------- audit log */

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  table_name text not null,
  record_key text,
  action text not null,
  changed_keys text[] not null default '{}',
  old_data jsonb,
  new_data jsonb,
  notified_at timestamptz
);
create index audit_log_at_idx on public.audit_log (at desc);
alter table public.audit_log enable row level security;
revoke insert, update, delete on public.audit_log from anon, authenticated;
create policy "Admins can read the audit log" on public.audit_log
  for select to authenticated using ((select public.is_admin()));

create or replace function public.audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old jsonb := case when tg_op = 'INSERT' then null else (to_jsonb(old) -> 'data') end;
  v_new jsonb := case when tg_op = 'DELETE' then null else (to_jsonb(new) -> 'data') end;
  v_key text := coalesce(v_row ->> 'key', v_row ->> 'id');
  v_keys text[];
begin
  if v_key = 'youtube' then
    return null;
  end if;
  select coalesce(array_agg(t.k order by t.k), '{}') into v_keys
  from jsonb_object_keys(coalesce(v_old, '{}'::jsonb) || coalesce(v_new, '{}'::jsonb)) as t(k)
  where (v_old -> t.k) is distinct from (v_new -> t.k);

  if tg_op = 'UPDATE' and cardinality(v_keys) = 0 then
    return null;
  end if;

  insert into public.audit_log (actor_id, actor_email, table_name, record_key, action, changed_keys, old_data, new_data)
  values (auth.uid(), auth.jwt() ->> 'email', tg_table_name, coalesce(v_row ->> 'collection' || ':', '') || v_key,
          lower(tg_op), v_keys, v_old, v_new);
  return null;
end;
$$;
create trigger audit_site_config after insert or update or delete on public.site_config
  for each row execute function public.audit_change();
create trigger audit_content_items after insert or update or delete on public.content_items
  for each row execute function public.audit_change();

/* ------------------------------------------------------------- read RPCs */

create or replace function public.collection_json(p_collection text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(c.data || jsonb_build_object('id', c.id) order by c.position, c.created_at desc),
    '[]'::jsonb)
  from public.content_items c
  where c.collection = p_collection;
$$;

create or replace function public.get_site()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'settings', (select data from public.site_config where key = 'settings'),
    'live', (select data from public.site_config where key = 'live'),
    'youtube', (select data - 'lastError' from public.site_config where key = 'youtube'),
    'sessions', public.collection_json('sessions'),
    'activities', public.collection_json('activities'),
    'ministries', public.collection_json('ministries'),
    'leaders', public.collection_json('leaders'),
    'gallery', public.collection_json('gallery')
  );
$$;

create or replace function public.get_sermons()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'manual', public.collection_json('sermons'),
    'youtube', coalesce((
      select jsonb_agg(jsonb_build_object(
               'videoId', v.video_id,
               'title', v.title,
               'description', v.description,
               'date', to_char(v.published_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'),
               'thumbnail', v.thumbnail)
             order by v.published_at desc)
      from public.youtube_videos v
      where v.source_key = (select data ->> 'sourceKey' from public.site_config where key = 'youtube')
    ), '[]'::jsonb)
  );
$$;

create or replace function public.admin_data()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Please sign in as an admin.' using errcode = '42501';
  end if;
  return public.get_site() || jsonb_build_object(
    'youtube', (select data from public.site_config where key = 'youtube'),
    'sermons', public.collection_json('sermons'),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'type', m.type, 'name', m.name, 'email', m.email, 'phone', m.phone,
               'message', m.message, 'read', m.read, 'createdAt', m.created_at)
             order by m.created_at desc)
      from public.messages m), '[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object(
               'at', a.at, 'actorEmail', a.actor_email, 'table', a.table_name,
               'recordKey', a.record_key, 'action', a.action, 'changedKeys', a.changed_keys)
             order by a.at desc)
      from (select * from public.audit_log order by at desc limit 15) a), '[]'::jsonb),
    'givingChange', (
      select jsonb_build_object('at', a.at, 'by', a.actor_email, 'keys', a.changed_keys)
      from public.audit_log a
      where a.table_name = 'site_config' and a.record_key = 'settings'
        and a.changed_keys && array['upiId', 'upiQrImage', 'bankAccountName', 'bankAccountNumber', 'bankIfsc', 'bankName', 'bankBranch']
      order by a.at desc limit 1)
  );
end;
$$;

create or replace function public.reorder_items(p_collection text, p_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Please sign in as an admin.' using errcode = '42501';
  end if;
  update public.content_items c
     set position = t.ord
    from unnest(p_ids) with ordinality as t(id, ord)
   where c.id = t.id and c.collection = p_collection;
end;
$$;

/* ------------------------------------------------------------------ storage */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and (select public.is_admin()));
create policy "Admins can replace media" on storage.objects
  for update to authenticated using (bucket_id = 'media' and (select public.is_admin()));
create policy "Admins can delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and (select public.is_admin()));

/* --------------------------------------------------------------------- seed */

insert into public.site_config (key, data) values
('settings', jsonb_build_object(
  'name', 'The Vine Cell Church',
  'location', '',
  'tagline', 'A place to grow in faith, family and fellowship.',
  'timeZone', 'Asia/Kolkata',
  'logoUrl', '', 'heroImage', '',
  'announcementEnabled', false, 'announcementText', '', 'announcementLinkText', '', 'announcementLink', '',
  'serviceTimes', '[]'::jsonb,
  'address', '', 'mapEmbedUrl', '', 'mapDirectionsUrl', '',
  'phone', '', 'prayerPhones', '', 'whatsapp', '', 'email', '',
  'youtubeChannelId', '', 'youtubePlaylistId', '', 'youtubeUrl', '', 'instagramUrl', '', 'facebookUrl', '',
  'aboutStory', '', 'aboutMission', '', 'aboutVision', '', 'beliefs', '[]'::jsonb,
  'givingIntro', 'Thank you for partnering with us. Every gift helps us care for one another and serve our city.',
  'upiId', '', 'upiQrImage', '', 'bankAccountName', '', 'bankAccountNumber', '', 'bankIfsc', '', 'bankName', '', 'bankBranch', '',
  'registrationNote', '',
  'messageRetentionMonths', 12
)),
('live', '{"isLive": false, "videoUrl": "", "title": "", "speaker": "", "description": ""}'::jsonb),
('youtube', '{}'::jsonb)
on conflict (key) do nothing;
