-- Community and Creator moderation for Classendo administrators.
-- Public clients retain their existing Community queries. Restrictive RLS and
-- moderation triggers ensure hidden/deleted content cannot be republished by
-- ordinary users. Administrator data access remains service-role-only.

alter table public.lesson_sets
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_at timestamptz,
  add column if not exists featured_by uuid references auth.users(id) on delete set null,
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists moderation_note text;

alter table public.lesson_sets
  drop constraint if exists lesson_sets_moderation_note_check;
alter table public.lesson_sets
  add constraint lesson_sets_moderation_note_check
  check (moderation_note is null or char_length(moderation_note) <= 500);

create index if not exists lesson_sets_moderation_status_idx
  on public.lesson_sets (is_featured, hidden_at, deleted_at, created_at desc);

create or replace function public.protect_lesson_set_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated' and (
    new.is_featured is distinct from old.is_featured
    or new.featured_at is distinct from old.featured_at
    or new.featured_by is distinct from old.featured_by
    or new.hidden_at is distinct from old.hidden_at
    or new.hidden_by is distinct from old.hidden_by
    or new.deleted_at is distinct from old.deleted_at
    or new.deleted_by is distinct from old.deleted_by
    or new.moderation_note is distinct from old.moderation_note
  ) then
    raise exception 'Moderation fields can only be changed by Classendo administrators.'
      using errcode = '42501';
  end if;

  if new.is_public = true and (new.hidden_at is not null or new.deleted_at is not null) then
    raise exception 'Hidden or deleted lesson sets cannot be public.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_lesson_set_moderation() from public;

drop trigger if exists protect_lesson_set_moderation_fields on public.lesson_sets;
create trigger protect_lesson_set_moderation_fields
  before update on public.lesson_sets
  for each row execute function public.protect_lesson_set_moderation();

alter table public.lesson_sets enable row level security;

drop policy if exists "lesson_sets_moderation_visibility" on public.lesson_sets;
create policy "lesson_sets_moderation_visibility"
  on public.lesson_sets
  as restrictive
  for select
  to anon, authenticated
  using (
    deleted_at is null
    and (hidden_at is null or user_id = auth.uid())
  );

-- Administrator accounts can create quick-use sets without consuming the
-- ordinary Free-plan saved-set allowance.
create or replace function public.enforce_free_lesson_set_save_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  lesson_count integer;
begin
  if public.has_premium_access(new.user_id)
     or exists (
       select 1
         from public.admin_memberships am
        where am.user_id = new.user_id
     ) then
    return new;
  end if;

  select count(*)
    into lesson_count
    from public.lesson_sets ls
   where ls.user_id = new.user_id
     and ls.deleted_at is null
     and ls.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if lesson_count >= 6 then
    raise exception 'Free accounts can save up to 6 lesson sets. Upgrade to Premium for unlimited saves.';
  end if;

  return new;
end;
$$;

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  lesson_set_id uuid not null references public.lesson_sets(id) on delete cascade,
  reporter_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  reason text not null,
  status text not null default 'pending',
  resolution_note text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_reports_reason_check
    check (char_length(btrim(reason)) between 5 and 500),
  constraint community_reports_status_check
    check (status in ('pending', 'resolved', 'dismissed')),
  constraint community_reports_resolution_note_check
    check (resolution_note is null or char_length(resolution_note) <= 500)
);

create unique index if not exists community_reports_pending_reporter_set_idx
  on public.community_reports (reporter_user_id, lesson_set_id)
  where status = 'pending' and reporter_user_id is not null;

create index if not exists community_reports_status_created_idx
  on public.community_reports (status, created_at desc);

create index if not exists community_reports_set_created_idx
  on public.community_reports (lesson_set_id, created_at desc);

alter table public.community_reports enable row level security;

drop policy if exists "community_reports_insert_own" on public.community_reports;
create policy "community_reports_insert_own"
  on public.community_reports
  for insert
  to authenticated
  with check (
    reporter_user_id = auth.uid()
    and exists (
      select 1
        from public.lesson_sets ls
       where ls.id = lesson_set_id
         and ls.is_public = true
         and ls.hidden_at is null
         and ls.deleted_at is null
         and ls.user_id <> auth.uid()
    )
  );

revoke all on table public.community_reports from public, anon, authenticated;
grant insert on table public.community_reports to authenticated;
grant select, insert, update, delete on table public.community_reports to service_role;

-- Creator moderation metadata is added only when the Creator foundation is
-- installed, keeping this migration safe in environments that have not yet
-- enabled Creator.
do $$
begin
  if to_regclass('public.creator_images') is not null then
    alter table public.creator_images
      add column if not exists moderation_note text,
      add column if not exists moderated_at timestamptz,
      add column if not exists moderated_by uuid references auth.users(id) on delete set null;

    alter table public.creator_images
      drop constraint if exists creator_images_moderation_note_check;
    alter table public.creator_images
      add constraint creator_images_moderation_note_check
      check (moderation_note is null or char_length(moderation_note) <= 500);

    create index if not exists creator_images_moderation_idx
      on public.creator_images (status, deleted_at, created_at desc);
  end if;
end;
$$;

create or replace function public.protect_creator_image_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated' and (
    new.status is distinct from old.status
    or new.deleted_at is distinct from old.deleted_at
    or new.moderation_note is distinct from old.moderation_note
    or new.moderated_at is distinct from old.moderated_at
    or new.moderated_by is distinct from old.moderated_by
  ) then
    raise exception 'Creator moderation fields can only be changed by Classendo administrators.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_creator_image_moderation() from public;

do $$
begin
  if to_regclass('public.creator_images') is not null then
    drop trigger if exists protect_creator_image_moderation_fields on public.creator_images;
    create trigger protect_creator_image_moderation_fields
      before update on public.creator_images
      for each row execute function public.protect_creator_image_moderation();
  end if;
end;
$$;

create or replace function public.get_admin_community_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  creator_count bigint := 0;
begin
  if to_regclass('public.creator_images') is not null then
    execute 'select count(*) from public.creator_images where deleted_at is null'
      into creator_count;
  end if;

  return jsonb_build_object(
    'public_sets', (
      select count(*) from public.lesson_sets
       where is_public = true and hidden_at is null and deleted_at is null
    ),
    'featured_sets', (
      select count(*) from public.lesson_sets
       where is_featured = true and hidden_at is null and deleted_at is null
    ),
    'hidden_sets', (
      select count(*) from public.lesson_sets
       where hidden_at is not null and deleted_at is null
    ),
    'deleted_sets', (
      select count(*) from public.lesson_sets where deleted_at is not null
    ),
    'pending_reports', (
      select count(*) from public.community_reports where status = 'pending'
    ),
    'creator_images', creator_count
  );
end;
$$;

create or replace function public.get_admin_community_sets(
  search_query text default '',
  status_filter text default 'all',
  page_size integer default 20,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_size integer := least(greatest(coalesce(page_size, 20), 1), 100);
  safe_offset integer := greatest(coalesce(page_offset, 0), 0);
  normalized_search text := lower(btrim(coalesce(search_query, '')));
  normalized_status text := lower(coalesce(status_filter, 'all'));
  total_count bigint := 0;
  rows_json jsonb := '[]'::jsonb;
begin
  with base as (
    select
      ls.*,
      au.email,
      p.username,
      p.display_name,
      (select count(*) from public.cards c where c.lesson_set_id = ls.id) as card_count,
      (select count(*) from public.community_reports cr where cr.lesson_set_id = ls.id) as report_count,
      (select count(*) from public.community_reports cr where cr.lesson_set_id = ls.id and cr.status = 'pending') as pending_report_count
    from public.lesson_sets ls
    left join auth.users au on au.id = ls.user_id
    left join public.profiles p on p.id = ls.user_id
  ),
  filtered as (
    select * from base
     where (
       normalized_search = ''
       or lower(coalesce(name, '')) like '%' || normalized_search || '%'
       or lower(coalesce(email, '')) like '%' || normalized_search || '%'
       or lower(coalesce(username, '')) like '%' || normalized_search || '%'
     )
       and (
         normalized_status = 'all'
         or (normalized_status = 'public' and is_public = true and hidden_at is null and deleted_at is null)
         or (normalized_status = 'featured' and is_featured = true and hidden_at is null and deleted_at is null)
         or (normalized_status = 'reported' and pending_report_count > 0)
         or (normalized_status = 'hidden' and hidden_at is not null and deleted_at is null)
         or (normalized_status = 'deleted' and deleted_at is not null)
       )
  )
  select count(*) into total_count from filtered;

  with base as (
    select
      ls.*,
      au.email,
      p.username,
      p.display_name,
      (select count(*) from public.cards c where c.lesson_set_id = ls.id) as card_count,
      (select count(*) from public.community_reports cr where cr.lesson_set_id = ls.id) as report_count,
      (select count(*) from public.community_reports cr where cr.lesson_set_id = ls.id and cr.status = 'pending') as pending_report_count
    from public.lesson_sets ls
    left join auth.users au on au.id = ls.user_id
    left join public.profiles p on p.id = ls.user_id
  ),
  filtered as (
    select * from base
     where (
       normalized_search = ''
       or lower(coalesce(name, '')) like '%' || normalized_search || '%'
       or lower(coalesce(email, '')) like '%' || normalized_search || '%'
       or lower(coalesce(username, '')) like '%' || normalized_search || '%'
     )
       and (
         normalized_status = 'all'
         or (normalized_status = 'public' and is_public = true and hidden_at is null and deleted_at is null)
         or (normalized_status = 'featured' and is_featured = true and hidden_at is null and deleted_at is null)
         or (normalized_status = 'reported' and pending_report_count > 0)
         or (normalized_status = 'hidden' and hidden_at is not null and deleted_at is null)
         or (normalized_status = 'deleted' and deleted_at is not null)
       )
     order by pending_report_count desc, is_featured desc, created_at desc, id
     limit safe_size offset safe_offset
  )
  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb)
    into rows_json from filtered;

  return jsonb_build_object(
    'sets', rows_json,
    'total', total_count,
    'limit', safe_size,
    'offset', safe_offset
  );
end;
$$;

create or replace function public.get_admin_community_reports(
  status_filter text default 'pending',
  page_size integer default 20,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_size integer := least(greatest(coalesce(page_size, 20), 1), 100);
  safe_offset integer := greatest(coalesce(page_offset, 0), 0);
  normalized_status text := lower(coalesce(status_filter, 'pending'));
  total_count bigint := 0;
  rows_json jsonb := '[]'::jsonb;
begin
  with base as (
    select
      cr.*,
      ls.name as lesson_set_name,
      ls.user_id as lesson_set_owner_id,
      reporter.email as reporter_email,
      owner.email as owner_email
    from public.community_reports cr
    join public.lesson_sets ls on ls.id = cr.lesson_set_id
    left join auth.users reporter on reporter.id = cr.reporter_user_id
    left join auth.users owner on owner.id = ls.user_id
  ),
  filtered as (
    select * from base
     where normalized_status = 'all' or status = normalized_status
  )
  select count(*) into total_count from filtered;

  with base as (
    select
      cr.*,
      ls.name as lesson_set_name,
      ls.user_id as lesson_set_owner_id,
      reporter.email as reporter_email,
      owner.email as owner_email
    from public.community_reports cr
    join public.lesson_sets ls on ls.id = cr.lesson_set_id
    left join auth.users reporter on reporter.id = cr.reporter_user_id
    left join auth.users owner on owner.id = ls.user_id
  ),
  filtered as (
    select * from base
     where normalized_status = 'all' or status = normalized_status
     order by created_at desc, id
     limit safe_size offset safe_offset
  )
  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb)
    into rows_json from filtered;

  return jsonb_build_object(
    'reports', rows_json,
    'total', total_count,
    'limit', safe_size,
    'offset', safe_offset
  );
end;
$$;

create or replace function public.get_admin_creator_images(
  status_filter text default 'all',
  page_size integer default 20,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_size integer := least(greatest(coalesce(page_size, 20), 1), 100);
  safe_offset integer := greatest(coalesce(page_offset, 0), 0);
  normalized_status text := lower(coalesce(status_filter, 'all'));
  total_count bigint := 0;
  rows_json jsonb := '[]'::jsonb;
begin
  if to_regclass('public.creator_images') is null then
    return jsonb_build_object('images', '[]'::jsonb, 'total', 0, 'limit', safe_size, 'offset', safe_offset);
  end if;

  with base as (
    select
      ci.*,
      au.email,
      p.username,
      p.display_name,
      (select count(*) from public.creator_flashcards cf where cf.creator_image_id = ci.id) as creator_card_count,
      (select count(*) from public.cards c where c.creator_image_id = ci.id) as lesson_card_count
    from public.creator_images ci
    left join auth.users au on au.id = ci.user_id
    left join public.profiles p on p.id = ci.user_id
  ),
  filtered as (
    select * from base
     where normalized_status = 'all'
        or (normalized_status = 'ready' and status = 'ready' and deleted_at is null)
        or (normalized_status = 'rejected' and status = 'rejected' and deleted_at is null)
        or (normalized_status = 'deleted' and deleted_at is not null)
  )
  select count(*) into total_count from filtered;

  with base as (
    select
      ci.*,
      au.email,
      p.username,
      p.display_name,
      (select count(*) from public.creator_flashcards cf where cf.creator_image_id = ci.id) as creator_card_count,
      (select count(*) from public.cards c where c.creator_image_id = ci.id) as lesson_card_count
    from public.creator_images ci
    left join auth.users au on au.id = ci.user_id
    left join public.profiles p on p.id = ci.user_id
  ),
  filtered as (
    select * from base
     where normalized_status = 'all'
        or (normalized_status = 'ready' and status = 'ready' and deleted_at is null)
        or (normalized_status = 'rejected' and status = 'rejected' and deleted_at is null)
        or (normalized_status = 'deleted' and deleted_at is not null)
     order by created_at desc, id
     limit safe_size offset safe_offset
  )
  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb)
    into rows_json from filtered;

  return jsonb_build_object(
    'images', rows_json,
    'total', total_count,
    'limit', safe_size,
    'offset', safe_offset
  );
end;
$$;

revoke all on function public.get_admin_community_summary()
  from public, anon, authenticated;
revoke all on function public.get_admin_community_sets(text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.get_admin_community_reports(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.get_admin_creator_images(text, integer, integer)
  from public, anon, authenticated;

grant execute on function public.get_admin_community_summary() to service_role;
grant execute on function public.get_admin_community_sets(text, text, integer, integer) to service_role;
grant execute on function public.get_admin_community_reports(text, integer, integer) to service_role;
grant execute on function public.get_admin_creator_images(text, integer, integer) to service_role;
