-- Consent-gated, first-party analytics for the public Free Games workflow.
-- This table deliberately stores topic metadata only, never teacher-entered prompts.
create table if not exists public.free_game_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'hub_viewed', 'game_selected', 'topic_previewed', 'topic_selected',
    'game_started', 'game_completed', 'finish_action'
  )),
  game_key text,
  topic_id text,
  topic_label text,
  topic_category text,
  account_tier text not null check (account_tier in ('guest', 'free_unconfirmed', 'free', 'trial', 'premium')),
  source text check (source in ('public_topic', 'lesson_tray', 'custom_vocabulary')),
  action text check (action in ('play_again', 'change_topic', 'change_game', 'use_own_vocabulary')),
  user_id uuid references auth.users(id) on delete set null,
  session_key text,
  created_at timestamptz not null default now(),
  constraint free_game_events_game_key_check check (game_key is null or char_length(game_key) between 1 and 80),
  constraint free_game_events_topic_id_check check (topic_id is null or char_length(topic_id) between 1 and 80),
  constraint free_game_events_session_key_check check (session_key is null or char_length(session_key) <= 80)
);

create index if not exists free_game_events_type_created_idx on public.free_game_events (event_type, created_at desc);
create index if not exists free_game_events_game_created_idx on public.free_game_events (game_key, created_at desc);
create index if not exists free_game_events_topic_created_idx on public.free_game_events (topic_id, created_at desc);
create index if not exists free_game_events_tier_created_idx on public.free_game_events (account_tier, created_at desc);

alter table public.free_game_events enable row level security;
revoke all on table public.free_game_events from public, anon, authenticated;
grant select, insert on table public.free_game_events to service_role;
