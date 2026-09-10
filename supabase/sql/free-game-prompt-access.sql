-- Apply with the free-games release, after premium-welcome-trial.sql.
-- Public topic games need no database writes. Saved preparation is Premium.
-- Restrictive policies compose with existing ownership and verification rules.
begin;
drop policy if exists "game_prompt_sets_premium_insert" on public.game_prompt_sets;
create policy "game_prompt_sets_premium_insert" on public.game_prompt_sets
  as restrictive for insert to authenticated
  with check (public.has_premium_access(auth.uid()));
drop policy if exists "game_prompt_sets_premium_update" on public.game_prompt_sets;
create policy "game_prompt_sets_premium_update" on public.game_prompt_sets
  as restrictive for update to authenticated
  using (public.has_premium_access(auth.uid()))
  with check (public.has_premium_access(auth.uid()));
commit;
