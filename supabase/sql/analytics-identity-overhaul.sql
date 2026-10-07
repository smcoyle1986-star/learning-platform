-- Apply after profile-auth-migration.sql, admin-user-management.sql,
-- seamless-signup-verification.sql, free-games-analytics.sql and
-- authenticated-user-analytics.sql. Additive: no event rows are removed.

alter table public.profiles add column if not exists user_type text;
alter table public.profiles drop constraint if exists profiles_user_type_check;
alter table public.profiles add constraint profiles_user_type_check
  check (user_type is null or user_type in ('Teacher', 'Online tutor', 'Student', 'Parent', 'Other'));

create or replace function public.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
  v_country_region text;
  v_user_type text;
begin
  v_username := nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
  if v_username is null then
    v_username := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;
  v_country_region := nullif(trim(coalesce(new.raw_user_meta_data ->> 'country_region', '')), '');
  v_user_type := new.raw_user_meta_data ->> 'user_type';
  if v_user_type not in ('Teacher', 'Online tutor', 'Student', 'Parent', 'Other') then
    v_user_type := null;
  end if;
  insert into public.profiles (id, display_name, username, country_region, user_type, avatar_url, created_at)
  values (new.id, v_username, v_username, v_country_region, v_user_type, null, now())
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Authenticated users can update their profile under existing RLS. Observed
-- location must therefore be in a private service-role-only table.
create table if not exists public.analytics_account_countries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  signup_country_observed text check (signup_country_observed ~ '^[A-Z]{2}$'),
  last_country_observed text check (last_country_observed ~ '^[A-Z]{2}$'),
  last_observed_at timestamptz
);
alter table public.analytics_account_countries enable row level security;
revoke all on public.analytics_account_countries from public, anon, authenticated;
grant select, insert, update on public.analytics_account_countries to service_role;

create table if not exists public.analytics_sessions (
  session_key text primary key check (session_key ~ '^[a-z0-9-]{1,80}$'),
  anonymous_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  guest_last_seen_at timestamptz,
  first_country_observed text check (first_country_observed ~ '^[A-Z]{2}$'),
  last_country_observed text check (last_country_observed ~ '^[A-Z]{2}$'),
  guest_last_country_observed text check (guest_last_country_observed ~ '^[A-Z]{2}$')
);
create index if not exists analytics_sessions_anonymous_seen_idx
  on public.analytics_sessions (anonymous_id, last_seen_at desc) where anonymous_id is not null;
create index if not exists analytics_sessions_user_seen_idx
  on public.analytics_sessions (user_id, last_seen_at desc) where user_id is not null;
alter table public.analytics_sessions enable row level security;
revoke all on public.analytics_sessions from public, anon, authenticated;
grant select, insert, update on public.analytics_sessions to service_role;

create table if not exists public.analytics_anonymous_account_links (
  anonymous_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  link_reason text not null check (link_reason in ('signup', 'sign_in'))
);
create index if not exists analytics_anonymous_account_links_user_idx
  on public.analytics_anonymous_account_links (user_id, linked_at desc);
alter table public.analytics_anonymous_account_links enable row level security;
revoke all on public.analytics_anonymous_account_links from public, anon, authenticated;
grant select, insert on public.analytics_anonymous_account_links to service_role;

alter table public.analytics_events add column if not exists anonymous_id uuid;
alter table public.analytics_events add column if not exists country_code text;
alter table public.analytics_events drop constraint if exists analytics_events_type_check;
alter table public.analytics_events add constraint analytics_events_type_check check (event_type in (
  'page_view', 'vocabulary_search', 'flashcard_view', 'worksheet_generated',
  'flashcards_opened', 'classroom_opened', 'lesson_pack_viewed',
  'lesson_pack_downloaded', 'premium_upgrade', 'dashboard_opened',
  'onboarding_started', 'onboarding_completed', 'lesson_set_created',
  'lesson_set_saved', 'worksheet_saved'
));
alter table public.analytics_events drop constraint if exists analytics_events_country_code_check;
alter table public.analytics_events add constraint analytics_events_country_code_check
  check (country_code is null or country_code ~ '^[A-Z]{2}$');
create index if not exists analytics_events_anonymous_created_idx
  on public.analytics_events (anonymous_id, created_at desc) where anonymous_id is not null;
alter table public.free_game_events add column if not exists anonymous_id uuid;
create index if not exists free_game_events_anonymous_created_idx
  on public.free_game_events (anonymous_id, created_at desc) where anonymous_id is not null;
create index if not exists free_game_events_user_created_idx
  on public.free_game_events (user_id, created_at desc) where user_id is not null;
alter table public.game_play_events add column if not exists anonymous_id uuid;
alter table public.game_play_events add column if not exists country_code text;
alter table public.game_play_events add column if not exists event_key text;
alter table public.game_play_events drop constraint if exists game_play_events_country_code_check;
alter table public.game_play_events add constraint game_play_events_country_code_check
  check (country_code is null or country_code ~ '^[A-Z]{2}$');
create unique index if not exists game_play_events_event_key_idx
  on public.game_play_events (event_key) where event_key is not null;
create index if not exists game_play_events_anonymous_created_idx
  on public.game_play_events (anonymous_id, created_at desc) where anonymous_id is not null;
create index if not exists game_play_events_user_created_idx
  on public.game_play_events (user_id, created_at desc) where user_id is not null;

-- One atomic observation per request keeps first and last times ordered even
-- when two event requests reach separate server instances concurrently.
create or replace function public.record_analytics_session(
  p_session_key text, p_anonymous_id uuid, p_user_id uuid, p_country text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_session_key is null or p_session_key !~ '^[a-z0-9-]{1,80}$' then return; end if;
  if p_country is not null and p_country !~ '^[A-Z]{2}$' then p_country := null; end if;
  insert into public.analytics_sessions
    (session_key, anonymous_id, user_id, guest_last_seen_at, first_country_observed, last_country_observed, guest_last_country_observed)
  values (p_session_key, p_anonymous_id, p_user_id,
    case when p_user_id is null then now() else null end, p_country, p_country,
    case when p_user_id is null then p_country else null end)
  on conflict (session_key) do update set
    anonymous_id = coalesce(public.analytics_sessions.anonymous_id, excluded.anonymous_id),
    user_id = coalesce(excluded.user_id, public.analytics_sessions.user_id),
    last_seen_at = greatest(public.analytics_sessions.last_seen_at, now()),
    first_country_observed = coalesce(public.analytics_sessions.first_country_observed, excluded.first_country_observed),
    last_country_observed = coalesce(excluded.last_country_observed, public.analytics_sessions.last_country_observed),
    guest_last_seen_at = case when p_user_id is null then now() else public.analytics_sessions.guest_last_seen_at end,
    guest_last_country_observed = case when p_user_id is null then coalesce(p_country, public.analytics_sessions.guest_last_country_observed)
      else public.analytics_sessions.guest_last_country_observed end;
  if p_user_id is not null and p_country is not null then
    insert into public.analytics_account_countries (user_id, last_country_observed, last_observed_at)
    values (p_user_id, p_country, now())
    on conflict (user_id) do update set
      last_country_observed = excluded.last_country_observed,
      last_observed_at = excluded.last_observed_at
    where public.analytics_account_countries.last_observed_at is null
       or public.analytics_account_countries.last_observed_at <= excluded.last_observed_at;
  end if;
end;
$$;
revoke all on function public.record_analytics_session(text, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.record_analytics_session(text, uuid, uuid, text) to service_role;

create or replace function public.get_admin_identity_summary(period_days integer default 30)
returns jsonb language sql stable security definer set search_path = '' as $$
  with bounds as (
    select case when period_days is null or period_days <= 0 then null::timestamptz
      else now() - make_interval(days => least(period_days, 365)) end as since_at
  ), accounts as (
    select au.id, au.created_at, au.last_sign_in_at, p.user_type,
      case when ev.user_id is not null then
        case when ev.normalized_email = lower(trim(coalesce(au.email, ''))) then ev.verified_at end
      else au.email_confirmed_at end as verified_at,
      us.premium_trial_started_at, us.premium_trial_ends_at,
      coalesce(us.subscription_tier = 'premium' and us.subscription_status in ('active','trialing','past_due'), false) as premium
    from auth.users au
    left join public.profiles p on p.id = au.id
    left join public.classendo_email_verifications ev on ev.user_id = au.id
    left join public.user_subscriptions us on us.user_id = au.id
  ), guests as (
    select s.anonymous_id, count(*) as sessions, min(s.first_seen_at) as first_seen,
      max(s.last_seen_at) as last_seen
    from public.analytics_sessions s, bounds b
    where s.anonymous_id is not null
      and (b.since_at is null or s.last_seen_at >= b.since_at)
      and not exists (select 1 from public.analytics_anonymous_account_links l where l.anonymous_id = s.anonymous_id)
    group by s.anonymous_id
  ), meaningful_guests as (
    select distinct anonymous_id from public.free_game_events, bounds b
      where anonymous_id is not null and event_type in ('game_started','meaningful_interaction','game_completed','use_own_vocabulary_clicked')
        and (b.since_at is null or created_at >= b.since_at)
    union
    select distinct anonymous_id from public.analytics_events, bounds b
      where anonymous_id is not null and event_type in ('vocabulary_search','flashcard_view','worksheet_generated','lesson_pack_downloaded')
        and (b.since_at is null or created_at >= b.since_at)
    union
    select distinct anonymous_id from public.game_play_events, bounds b
      where anonymous_id is not null and (b.since_at is null or created_at >= b.since_at)
  )
  select jsonb_build_object(
    'total_accounts', (select count(*) from accounts),
    'verified', (select count(*) from accounts where verified_at is not null),
    'unverified', (select count(*) from accounts where verified_at is null),
    'teachers', (select count(*) from accounts where user_type = 'Teacher'),
    'tutors', (select count(*) from accounts where user_type = 'Online tutor'),
    'students', (select count(*) from accounts where user_type = 'Student'),
    'parents', (select count(*) from accounts where user_type = 'Parent'),
    'other', (select count(*) from accounts where user_type = 'Other'),
    'unclassified', (select count(*) from accounts where user_type is null),
    'active_users', (select count(distinct a.id) from accounts a, bounds b
      where (a.last_sign_in_at is not null and (b.since_at is null or a.last_sign_in_at >= b.since_at))
        or exists (select 1 from public.analytics_sessions s
          where s.user_id = a.id and (b.since_at is null or s.last_seen_at >= b.since_at))),
    'new_users', (select count(*) from accounts a, bounds b where b.since_at is null or a.created_at >= b.since_at),
    'cohort_verified', (select count(*) from accounts a, bounds b where a.verified_at is not null and (b.since_at is null or a.created_at >= b.since_at)),
    'cohort_trial_started', (select count(*) from accounts a, bounds b where a.premium_trial_started_at is not null and (b.since_at is null or a.created_at >= b.since_at)),
    'trial_started', (select count(*) from accounts a, bounds b where a.premium_trial_started_at is not null and (b.since_at is null or a.premium_trial_started_at >= b.since_at)),
    'premium', (select count(*) from accounts where premium),
    'unique_guests', (select count(*) from guests),
    'returning_guests', (select count(*) from guests where sessions > 1),
    'guest_sessions', (select coalesce(sum(sessions), 0) from guests),
    'meaningful_guests', (select count(*) from guests g join meaningful_guests m using (anonymous_id)),
    'guest_signups', (select count(*) from public.analytics_anonymous_account_links l join auth.users a on a.id = l.user_id, bounds b
      where l.link_reason = 'signup' and (b.since_at is null or a.created_at >= b.since_at))
  );
$$;
revoke all on function public.get_admin_identity_summary(integer) from public, anon, authenticated;
grant execute on function public.get_admin_identity_summary(integer) to service_role;

create or replace function public.get_admin_analytics_guests(
  page_size integer default 25, page_offset integer default 0
) returns jsonb language sql stable security definer set search_path = '' as $$
  with grouped as (
    select s.anonymous_id, l.user_id as linked_user_id, p.username as linked_username,
      l.linked_at, min(s.first_seen_at) as first_seen_at,
      max(coalesce(s.guest_last_seen_at, least(s.last_seen_at, coalesce(l.linked_at, s.last_seen_at)))) as last_seen_at, count(*) as sessions,
      (array_agg(coalesce(s.guest_last_country_observed, s.first_country_observed) order by coalesce(s.guest_last_seen_at, s.first_seen_at) desc)
        filter (where coalesce(s.guest_last_country_observed, s.first_country_observed) is not null))[1] as last_country_observed,
      exists (select 1 from public.free_game_events f where f.anonymous_id = s.anonymous_id
        and f.event_type in ('game_started','meaningful_interaction','game_completed','use_own_vocabulary_clicked'))
      or exists (select 1 from public.analytics_events e where e.anonymous_id = s.anonymous_id
        and e.event_type in ('vocabulary_search','flashcard_view','worksheet_generated','lesson_pack_downloaded'))
      or exists (select 1 from public.game_play_events gp where gp.anonymous_id = s.anonymous_id) as meaningful
    from public.analytics_sessions s
    left join public.analytics_anonymous_account_links l on l.anonymous_id = s.anonymous_id
    left join public.profiles p on p.id = l.user_id
    where s.anonymous_id is not null and (l.linked_at is null or s.first_seen_at <= l.linked_at)
    group by s.anonymous_id, l.user_id, p.username, l.linked_at
  ), page as (
    select * from grouped order by last_seen_at desc
    limit least(greatest(coalesce(page_size, 25), 1), 100)
    offset greatest(coalesce(page_offset, 0), 0)
  )
  select jsonb_build_object('total', (select count(*) from grouped),
    'guests', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb));
$$;
revoke all on function public.get_admin_analytics_guests(integer, integer) from public, anon, authenticated;
grant execute on function public.get_admin_analytics_guests(integer, integer) to service_role;

create or replace function public.get_admin_user_activity(p_user_ids uuid[])
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', a.id,
    'first_seen_at', activity.first_seen_at,
    'last_event_at', activity.last_event_at,
    'sessions', activity.sessions,
    'meaningful_events', activity.meaningful_events
  )), '[]'::jsonb)
  from auth.users a
  cross join lateral (
    select min(created_at) as first_seen_at, max(created_at) as last_event_at,
      count(distinct session_key) as sessions,
      count(*) filter (where meaningful) as meaningful_events
    from (
      select e.created_at, e.session_key,
        e.event_type in ('vocabulary_search','flashcard_view','worksheet_generated',
          'lesson_pack_downloaded','lesson_set_created','lesson_set_saved','worksheet_saved') as meaningful
      from public.analytics_events e where e.user_id = a.id
      union all
      select f.created_at, f.session_key,
        f.event_type in ('game_started','meaningful_interaction','game_completed',
          'use_own_vocabulary_clicked')
      from public.free_game_events f where f.user_id = a.id
      union all
      select gp.created_at, gp.session_key, true
      from public.game_play_events gp where gp.user_id = a.id
      union all
      select e.created_at, e.session_key,
        e.event_type in ('vocabulary_search','flashcard_view','worksheet_generated','lesson_pack_downloaded')
      from public.analytics_events e
      join public.analytics_anonymous_account_links al on al.anonymous_id = e.anonymous_id
      where al.user_id = a.id and e.user_id is null and e.created_at <= al.linked_at
      union all
      select f.created_at, f.session_key,
        f.event_type in ('game_started','meaningful_interaction','game_completed','use_own_vocabulary_clicked')
      from public.free_game_events f
      join public.analytics_anonymous_account_links al on al.anonymous_id = f.anonymous_id
      where al.user_id = a.id and f.user_id is null and f.created_at <= al.linked_at
      union all
      select gp.created_at, gp.session_key, true
      from public.game_play_events gp
      join public.analytics_anonymous_account_links al on al.anonymous_id = gp.anonymous_id
      where al.user_id = a.id and gp.user_id is null and gp.created_at <= al.linked_at
      union all
      select l.created_at, l.session_key, false
      from public.analytics_lifecycle_events l
      where l.user_id = a.id and l.event_type = 'authenticated_session_started'
      union all
      select s.first_seen_at, s.session_key, false
      from public.analytics_sessions s where s.user_id = a.id
      union all
      select s.last_seen_at, s.session_key, false
      from public.analytics_sessions s where s.user_id = a.id
      union all
      select s.first_seen_at, s.session_key, false
      from public.analytics_sessions s
      join public.analytics_anonymous_account_links al on al.anonymous_id = s.anonymous_id
      where al.user_id = a.id and s.first_seen_at <= al.linked_at
    ) events
  ) activity
  where a.id = any(p_user_ids);
$$;
revoke all on function public.get_admin_user_activity(uuid[]) from public, anon, authenticated;
grant execute on function public.get_admin_user_activity(uuid[]) to service_role;

create or replace function public.get_admin_account_auth_fields(p_user_ids uuid[])
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', au.id,
    'email_verified_at', case when ev.user_id is not null then
      case when ev.normalized_email = lower(trim(coalesce(au.email, ''))) then ev.verified_at end
      else au.email_confirmed_at end)), '[]'::jsonb)
  from auth.users au
  left join public.classendo_email_verifications ev on ev.user_id = au.id
  where au.id = any(p_user_ids);
$$;
revoke all on function public.get_admin_account_auth_fields(uuid[]) from public, anon, authenticated;
grant execute on function public.get_admin_account_auth_fields(uuid[]) to service_role;
