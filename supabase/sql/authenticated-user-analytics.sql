-- Private, UUID-based account analytics. Usernames remain profile presentation
-- data and are deliberately not copied into event records.

create table if not exists public.analytics_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'account_created',
    'email_verified',
    'premium_trial_activated',
    'authenticated_session_started'
  )),
  session_key text,
  event_key text not null,
  created_at timestamptz not null default now(),
  constraint analytics_lifecycle_events_session_key_check
    check (session_key is null or session_key ~ '^[a-z0-9-]{1,80}$')
);

create unique index if not exists analytics_lifecycle_events_event_key_idx
  on public.analytics_lifecycle_events (event_key);
create index if not exists analytics_lifecycle_events_user_created_idx
  on public.analytics_lifecycle_events (user_id, created_at desc);

create table if not exists public.analytics_session_account_links (
  id uuid primary key default gen_random_uuid(),
  session_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  link_reason text not null check (link_reason in ('signup', 'sign_in')),
  constraint analytics_session_account_links_session_key_check
    check (session_key ~ '^[a-z0-9-]{1,80}$'),
  unique (session_key, user_id)
);

create index if not exists analytics_session_account_links_user_linked_idx
  on public.analytics_session_account_links (user_id, linked_at desc);
create index if not exists analytics_session_account_links_session_linked_idx
  on public.analytics_session_account_links (session_key, linked_at desc);

alter table public.analytics_lifecycle_events enable row level security;
alter table public.analytics_session_account_links enable row level security;
revoke all on public.analytics_lifecycle_events, public.analytics_session_account_links from public, anon, authenticated;
grant select, insert on public.analytics_lifecycle_events, public.analytics_session_account_links to service_role;

create or replace function public.capture_account_created_analytics_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_lifecycle_events (user_id, event_type, event_key, created_at)
  values (new.id, 'account_created', 'account-created:' || new.id::text, new.created_at)
  on conflict (event_key) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_analytics_lifecycle on auth.users;
create trigger on_auth_user_created_analytics_lifecycle
  after insert on auth.users
  for each row execute function public.capture_account_created_analytics_event();

-- Existing accounts are legitimate lifecycle history too. Preserve their real
-- creation time instead of inventing a migration-time timestamp.
insert into public.analytics_lifecycle_events (user_id, event_type, event_key, created_at)
select id, 'account_created', 'account-created:' || id::text, created_at
from auth.users
on conflict (event_key) do nothing;

alter table public.analytics_events drop constraint if exists analytics_events_type_check;
alter table public.analytics_events add constraint analytics_events_type_check check (
  event_type in (
    'vocabulary_search', 'flashcard_view', 'worksheet_generated',
    'flashcards_opened', 'classroom_opened', 'lesson_pack_viewed',
    'lesson_pack_downloaded', 'premium_upgrade', 'dashboard_opened',
    'onboarding_started', 'onboarding_completed', 'lesson_set_created',
    'lesson_set_saved', 'worksheet_saved'
  )
);
