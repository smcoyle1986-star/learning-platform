-- Classendo user feedback and administrator feedback operations.
-- Users submit through a rate-limited RPC. Administrator reads and writes use
-- the server-side service role only.

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null,
  message text not null,
  status text not null default 'pending',
  admin_note text,
  read_at timestamptz,
  resolved_at timestamptz,
  deleted_at timestamptz,
  handled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_feedback_category_check
    check (category in ('bug', 'feature', 'content', 'billing', 'account', 'other')),
  constraint user_feedback_message_check
    check (char_length(btrim(message)) between 10 and 4000),
  constraint user_feedback_status_check
    check (status in ('pending', 'read', 'resolved', 'deleted')),
  constraint user_feedback_admin_note_check
    check (admin_note is null or char_length(admin_note) <= 4000)
);

create index if not exists user_feedback_status_created_idx
  on public.user_feedback (status, created_at desc);

create index if not exists user_feedback_category_created_idx
  on public.user_feedback (category, created_at desc);

create index if not exists user_feedback_user_created_idx
  on public.user_feedback (user_id, created_at desc);

alter table public.user_feedback enable row level security;

revoke all on table public.user_feedback from public, anon, authenticated;
grant select, insert, update, delete on table public.user_feedback to service_role;

create or replace function public.submit_user_feedback(
  feedback_category text,
  feedback_message text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_category text := lower(btrim(coalesce(feedback_category, '')));
  normalized_message text := btrim(coalesce(feedback_message, ''));
  feedback_id uuid;
  recent_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  if normalized_category not in (
    'bug',
    'feature',
    'content',
    'billing',
    'account',
    'other'
  ) then
    raise exception 'Select a valid feedback category.'
      using errcode = '22023';
  end if;

  if char_length(normalized_message) < 10
     or char_length(normalized_message) > 4000 then
    raise exception 'Feedback must be between 10 and 4000 characters.'
      using errcode = '22023';
  end if;

  select count(*)
    into recent_count
    from public.user_feedback
   where user_id = current_user_id
     and created_at >= now() - interval '1 hour';

  if recent_count >= 5 then
    raise exception 'Feedback submission limit reached. Please try again later.'
      using errcode = 'P0001';
  end if;

  insert into public.user_feedback (
    user_id,
    category,
    message
  )
  values (
    current_user_id,
    normalized_category,
    normalized_message
  )
  returning id into feedback_id;

  return feedback_id;
end;
$$;

revoke all on function public.submit_user_feedback(text, text)
  from public, anon;
grant execute on function public.submit_user_feedback(text, text)
  to authenticated;

create or replace function public.get_admin_feedback(
  search_query text default '',
  status_filter text default 'all',
  category_filter text default 'all',
  page_size integer default 25,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_size integer := least(greatest(coalesce(page_size, 25), 1), 100);
  safe_offset integer := greatest(coalesce(page_offset, 0), 0);
  normalized_search text := lower(btrim(coalesce(search_query, '')));
  normalized_status text := lower(coalesce(status_filter, 'all'));
  normalized_category text := lower(coalesce(category_filter, 'all'));
  total_count bigint := 0;
  pending_count bigint := 0;
  read_count bigint := 0;
  resolved_count bigint := 0;
  deleted_count bigint := 0;
  rows_json jsonb := '[]'::jsonb;
begin
  with base as (
    select
      uf.id,
      uf.user_id,
      au.email,
      p.username,
      p.display_name,
      uf.category,
      uf.message,
      uf.status,
      uf.admin_note,
      uf.read_at,
      uf.resolved_at,
      uf.deleted_at,
      uf.handled_by,
      uf.created_at,
      uf.updated_at
    from public.user_feedback uf
    left join auth.users au on au.id = uf.user_id
    left join public.profiles p on p.id = uf.user_id
  ),
  filtered as (
    select *
      from base
     where (
       normalized_search = ''
       or lower(coalesce(email, '')) like '%' || normalized_search || '%'
       or lower(coalesce(username, '')) like '%' || normalized_search || '%'
       or lower(coalesce(display_name, '')) like '%' || normalized_search || '%'
       or lower(message) like '%' || normalized_search || '%'
     )
       and (normalized_status = 'all' or status = normalized_status)
       and (normalized_category = 'all' or category = normalized_category)
  )
  select
    count(*),
    count(*) filter (where status = 'pending'),
    count(*) filter (where status = 'read'),
    count(*) filter (where status = 'resolved'),
    count(*) filter (where status = 'deleted')
    into
      total_count,
      pending_count,
      read_count,
      resolved_count,
      deleted_count
    from filtered;

  with base as (
    select
      uf.id,
      uf.user_id,
      au.email,
      p.username,
      p.display_name,
      uf.category,
      uf.message,
      uf.status,
      uf.admin_note,
      uf.read_at,
      uf.resolved_at,
      uf.deleted_at,
      uf.handled_by,
      uf.created_at,
      uf.updated_at
    from public.user_feedback uf
    left join auth.users au on au.id = uf.user_id
    left join public.profiles p on p.id = uf.user_id
  ),
  filtered as (
    select *
      from base
     where (
       normalized_search = ''
       or lower(coalesce(email, '')) like '%' || normalized_search || '%'
       or lower(coalesce(username, '')) like '%' || normalized_search || '%'
       or lower(coalesce(display_name, '')) like '%' || normalized_search || '%'
       or lower(message) like '%' || normalized_search || '%'
     )
       and (normalized_status = 'all' or status = normalized_status)
       and (normalized_category = 'all' or category = normalized_category)
     order by
       case status
         when 'pending' then 0
         when 'read' then 1
         when 'resolved' then 2
         else 3
       end,
       created_at desc,
       id
     limit safe_size
     offset safe_offset
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'user_id', user_id,
        'email', email,
        'username', username,
        'display_name', display_name,
        'category', category,
        'message', message,
        'status', status,
        'has_admin_note', admin_note is not null and btrim(admin_note) <> '',
        'read_at', read_at,
        'resolved_at', resolved_at,
        'deleted_at', deleted_at,
        'handled_by', handled_by,
        'created_at', created_at,
        'updated_at', updated_at
      )
      order by
        case status
          when 'pending' then 0
          when 'read' then 1
          when 'resolved' then 2
          else 3
        end,
        created_at desc,
        id
    ),
    '[]'::jsonb
  )
    into rows_json
    from filtered;

  return jsonb_build_object(
    'feedback', rows_json,
    'total', total_count,
    'limit', safe_size,
    'offset', safe_offset,
    'summary', jsonb_build_object(
      'pending', pending_count,
      'read', read_count,
      'resolved', resolved_count,
      'deleted', deleted_count
    )
  );
end;
$$;

revoke all on function public.get_admin_feedback(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_admin_feedback(text, text, text, integer, integer)
  to service_role;
