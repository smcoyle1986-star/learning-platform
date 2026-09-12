-- Consent-gated, first-party analytics for the public Free Games workflow.
-- This table deliberately stores topic metadata only, never teacher-entered prompts.
create table if not exists public.free_game_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'hub_viewed', 'game_selected', 'topic_previewed', 'topic_selected',
    'game_started', 'game_completed', 'finish_action', 'signup_started',
    'signup_completed'
  )),
  game_key text,
  topic_id text,
  topic_label text,
  topic_category text,
  account_tier text not null check (account_tier in ('guest', 'free_unconfirmed', 'free', 'trial', 'premium')),
  source text check (source in ('public_topic', 'lesson_tray', 'custom_vocabulary', 'free_games')),
  action text check (action in ('play_again', 'change_topic', 'change_game', 'use_own_vocabulary', 'create_account')),
  user_id uuid references auth.users(id) on delete set null,
  session_key text,
  event_key text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer_host text,
  landing_path text,
  country_code text,
  created_at timestamptz not null default now(),
  constraint free_game_events_game_key_check check (game_key is null or char_length(game_key) between 1 and 80),
  constraint free_game_events_topic_id_check check (topic_id is null or char_length(topic_id) between 1 and 80),
  constraint free_game_events_session_key_check check (session_key is null or char_length(session_key) <= 80),
  constraint free_game_events_event_key_check check (event_key is null or char_length(event_key) <= 400),
  constraint free_game_events_attribution_value_check check (
    (utm_source is null or char_length(utm_source) <= 80) and
    (utm_medium is null or char_length(utm_medium) <= 80) and
    (utm_campaign is null or char_length(utm_campaign) <= 80) and
    (utm_content is null or char_length(utm_content) <= 80) and
    (utm_term is null or char_length(utm_term) <= 80) and
    (referrer_host is null or char_length(referrer_host) <= 80) and
    (landing_path is null or char_length(landing_path) <= 80) and
    (country_code is null or country_code ~ '^[A-Z]{2}$')
  )
);

create index if not exists free_game_events_type_created_idx on public.free_game_events (event_type, created_at desc);
create index if not exists free_game_events_game_created_idx on public.free_game_events (game_key, created_at desc);
create index if not exists free_game_events_topic_created_idx on public.free_game_events (topic_id, created_at desc);
create index if not exists free_game_events_tier_created_idx on public.free_game_events (account_tier, created_at desc);

alter table public.free_game_events add column if not exists event_key text;
alter table public.free_game_events drop constraint if exists free_game_events_event_type_check;
alter table public.free_game_events add constraint free_game_events_event_type_check check (event_type in (
  'hub_viewed', 'game_selected', 'topic_previewed', 'topic_selected',
  'game_started', 'game_completed', 'finish_action', 'signup_started',
  'signup_completed'
));
alter table public.free_game_events drop constraint if exists free_game_events_source_check;
alter table public.free_game_events add constraint free_game_events_source_check check (source in ('public_topic', 'lesson_tray', 'custom_vocabulary', 'free_games'));
alter table public.free_game_events drop constraint if exists free_game_events_action_check;
alter table public.free_game_events add constraint free_game_events_action_check check (action in ('play_again', 'change_topic', 'change_game', 'use_own_vocabulary', 'create_account'));
alter table public.free_game_events drop constraint if exists free_game_events_event_key_check;
alter table public.free_game_events add constraint free_game_events_event_key_check check (event_key is null or char_length(event_key) <= 400);
create unique index if not exists free_game_events_event_key_unique_idx on public.free_game_events (event_key) where event_key is not null;

alter table public.free_game_events add column if not exists utm_source text;
alter table public.free_game_events add column if not exists utm_medium text;
alter table public.free_game_events add column if not exists utm_campaign text;
alter table public.free_game_events add column if not exists utm_content text;
alter table public.free_game_events add column if not exists utm_term text;
alter table public.free_game_events add column if not exists referrer_host text;
alter table public.free_game_events add column if not exists landing_path text;
alter table public.free_game_events add column if not exists country_code text;
alter table public.free_game_events drop constraint if exists free_game_events_attribution_value_check;
alter table public.free_game_events add constraint free_game_events_attribution_value_check check (
  (utm_source is null or char_length(utm_source) <= 80) and
  (utm_medium is null or char_length(utm_medium) <= 80) and
  (utm_campaign is null or char_length(utm_campaign) <= 80) and
  (utm_content is null or char_length(utm_content) <= 80) and
  (utm_term is null or char_length(utm_term) <= 80) and
  (referrer_host is null or char_length(referrer_host) <= 80) and
  (landing_path is null or char_length(landing_path) <= 80) and
  (country_code is null or country_code ~ '^[A-Z]{2}$')
);
create index if not exists free_game_events_campaign_created_idx on public.free_game_events (utm_campaign, created_at desc) where utm_campaign is not null;
create index if not exists free_game_events_country_created_idx on public.free_game_events (country_code, created_at desc) where country_code is not null;

alter table public.free_game_events enable row level security;
revoke all on table public.free_game_events from public, anon, authenticated;
grant select, insert on table public.free_game_events to service_role;
