create table if not exists public.game_prompt_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null,
  name text not null,
  is_public boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_prompt_sets_user_game_updated_idx
  on public.game_prompt_sets (user_id, game_key, updated_at desc);

alter table public.game_prompt_sets enable row level security;

alter table public.game_prompt_sets
  add column if not exists is_public boolean not null default true;

drop policy if exists "game_prompt_sets_select_own" on public.game_prompt_sets;
drop policy if exists "game_prompt_sets_select_public" on public.game_prompt_sets;
create policy "game_prompt_sets_select_public"
  on public.game_prompt_sets
  for select
  using (auth.uid() = user_id or (auth.role() = 'authenticated' and is_public = true));

drop policy if exists "game_prompt_sets_insert_own" on public.game_prompt_sets;
create policy "game_prompt_sets_insert_own"
  on public.game_prompt_sets
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "game_prompt_sets_update_own" on public.game_prompt_sets;
create policy "game_prompt_sets_update_own"
  on public.game_prompt_sets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "game_prompt_sets_delete_own" on public.game_prompt_sets;
create policy "game_prompt_sets_delete_own"
  on public.game_prompt_sets
  for delete
  using (auth.uid() = user_id);
