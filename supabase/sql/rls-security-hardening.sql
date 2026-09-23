-- Supabase public-schema RLS hardening.
-- Apply only after executing the accompanying role-based regression tests.

begin;

-- Private profile base table + deliberately limited public projection.
alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
-- Remove every legacy policy that can directly SELECT profiles, regardless
-- of policy name. Public identity reads must use public_profiles instead.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy %I on public.profiles', p.policyname);
  end loop;
end
$$;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create or replace view public.public_profiles as select id, username, display_name from public.profiles;
revoke all on table public.public_profiles from public, anon, authenticated;
grant select on table public.public_profiles to anon, authenticated;

-- Public read-only vocabulary.
do $$
declare t text; p record;
begin
  foreach t in array array['nouns','verbs','adjectives','phonics','prepositions','vocab_images'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_public_read', t);
  end loop;
end
$$;

-- Card access helpers deliberately bypass lesson_sets RLS while using the caller's auth.uid().
create or replace function public.can_read_cards_for_lesson_set(target_set_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.lesson_sets as ls
    where ls.id = target_set_id and ls.deleted_at is null
      and (ls.user_id = auth.uid() or (ls.is_public = true and ls.hidden_at is null))
  );
$$;
create or replace function public.can_manage_cards_for_lesson_set(target_set_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.lesson_sets as ls
    where ls.id = target_set_id and ls.user_id = auth.uid() and ls.deleted_at is null
  );
$$;
revoke all on function public.can_read_cards_for_lesson_set(uuid) from public, anon, authenticated;
revoke all on function public.can_manage_cards_for_lesson_set(uuid) from public, anon, authenticated;
grant execute on function public.can_read_cards_for_lesson_set(uuid) to authenticated;
grant execute on function public.can_manage_cards_for_lesson_set(uuid) to authenticated;

-- Cards: private to owner, with signed-in Community reads only.
alter table public.cards enable row level security;
revoke all on table public.cards from public, anon, authenticated;
grant select, insert, update, delete on table public.cards to authenticated;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'cards' loop
    execute format('drop policy %I on public.cards', p.policyname);
  end loop;
end
$$;
create policy "cards_select_owner_or_visible_community" on public.cards for select to authenticated using (public.can_read_cards_for_lesson_set(lesson_set_id));
create policy "cards_insert_owner_set" on public.cards for insert to authenticated with check (public.can_manage_cards_for_lesson_set(lesson_set_id));
create policy "cards_update_owner_set" on public.cards for update to authenticated using (public.can_manage_cards_for_lesson_set(lesson_set_id)) with check (public.can_manage_cards_for_lesson_set(lesson_set_id));
create policy "cards_delete_owner_set" on public.cards for delete to authenticated using (public.can_manage_cards_for_lesson_set(lesson_set_id));

-- Server/admin-only tables.
do $$
declare t text; p record;
begin
  foreach t in array array['ai_saved_sets','ai_worksheets','images','noun_determiners','noun_forms','noun_grammar_tags'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end
$$;
alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from public, anon, authenticated;
grant select, insert on table public.stripe_webhook_events to service_role;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'stripe_webhook_events' loop
    execute format('drop policy %I on public.stripe_webhook_events', p.policyname);
  end loop;
end
$$;

commit;
