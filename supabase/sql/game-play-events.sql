create table if not exists public.game_play_events (
  id uuid primary key default gen_random_uuid(),
  game_key text not null,
  user_id uuid null references auth.users(id) on delete set null,
  session_key text null,
  created_at timestamptz not null default now()
);

create index if not exists game_play_events_game_key_created_at_idx
  on public.game_play_events (game_key, created_at desc);

create index if not exists game_play_events_created_at_idx
  on public.game_play_events (created_at desc);

alter table public.game_play_events enable row level security;
