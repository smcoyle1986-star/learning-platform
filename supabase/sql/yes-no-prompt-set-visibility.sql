-- Adds enforceable public/private visibility to reusable game prompt sets.
-- Existing records remain public to preserve the behavior they had before this field existed.

alter table public.game_prompt_sets
  add column if not exists is_public boolean not null default true;

alter table public.game_prompt_sets enable row level security;

drop policy if exists "game_prompt_sets_select_own" on public.game_prompt_sets;
drop policy if exists "game_prompt_sets_select_public" on public.game_prompt_sets;

create policy "game_prompt_sets_select_public"
  on public.game_prompt_sets
  for select
  using (auth.uid() = user_id or (auth.role() = 'authenticated' and is_public = true));
