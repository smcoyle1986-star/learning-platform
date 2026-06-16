-- Add username and country/region to profiles for the new Classendo signup flow.
-- Existing rows are intentionally left unchanged so we do not overwrite any current display names.
-- If you want to backfill existing users later, do it manually after reviewing the data.

alter table public.profiles
  add column if not exists username text,
  add column if not exists country_region text;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles enable row level security;

-- Keep public reads for community browsing and profile lookup.
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles
  for select
  using (true);

-- Users can create their own profile row.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Users can update only their own profile row.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_country_region text;
begin
  v_username := nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
  if v_username is null then
    v_username := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;

  v_country_region := nullif(trim(coalesce(new.raw_user_meta_data ->> 'country_region', '')), '');

  insert into public.profiles (id, display_name, username, country_region, avatar_url, created_at)
  values (
    new.id,
    v_username,
    v_username,
    v_country_region,
    null,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();
