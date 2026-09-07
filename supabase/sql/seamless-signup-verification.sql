-- Seamless signup with Classendo-owned email verification.
--
-- Apply this before disabling Supabase Auth "Confirm email". Supabase can then
-- create an immediate session, while this migration keeps proof of mailbox
-- ownership, Premium trials, and sensitive publishing actions separate.

create table if not exists public.classendo_email_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  normalized_email text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classendo_email_verification_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  normalized_email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists classendo_email_verification_tokens_user_idx
  on public.classendo_email_verification_tokens (user_id, created_at desc);

-- This registry is populated only after Classendo verifies the mailbox. It is
-- deliberately separate from the legacy account_email_registry, which recorded
-- an email before it was verified and therefore cannot be used for trials.
create table if not exists public.classendo_verified_trial_emails (
  normalized_email text primary key,
  first_verified_user_id uuid not null references auth.users(id) on delete restrict,
  first_verified_at timestamptz not null default now()
);

create table if not exists public.classendo_auth_rate_limit_events (
  id bigint generated always as identity primary key,
  action text not null,
  subject_hash text not null,
  created_at timestamptz not null default now(),
  constraint classendo_auth_rate_limit_action_check check (char_length(action) between 1 and 80),
  constraint classendo_auth_rate_limit_subject_check check (char_length(subject_hash) between 16 and 256)
);

create index if not exists classendo_auth_rate_limit_events_lookup_idx
  on public.classendo_auth_rate_limit_events (action, subject_hash, created_at desc);

alter table public.classendo_email_verifications enable row level security;
alter table public.classendo_email_verification_tokens enable row level security;
alter table public.classendo_verified_trial_emails enable row level security;
alter table public.classendo_auth_rate_limit_events enable row level security;
revoke all on public.classendo_email_verifications, public.classendo_email_verification_tokens,
  public.classendo_verified_trial_emails, public.classendo_auth_rate_limit_events from anon, authenticated;

-- Existing confirmed users remain verified. Their subscription and trial data
-- is intentionally left untouched.
insert into public.classendo_email_verifications (user_id, normalized_email, verified_at)
select id, lower(trim(email)), email_confirmed_at
from auth.users
where email is not null and trim(email) <> '' and email_confirmed_at is not null
on conflict (user_id) do update
set normalized_email = excluded.normalized_email,
    verified_at = coalesce(public.classendo_email_verifications.verified_at, excluded.verified_at),
    updated_at = now();

-- Preserve the one-trial rule for every existing account that has consumed one.
insert into public.classendo_verified_trial_emails (normalized_email, first_verified_user_id, first_verified_at)
select lower(trim(au.email)), au.id, coalesce(us.premium_trial_started_at, au.email_confirmed_at, au.created_at, now())
from auth.users au
join public.user_subscriptions us on us.user_id = au.id
where au.email is not null
  and trim(au.email) <> ''
  and coalesce(us.premium_trial_used, false)
on conflict (normalized_email) do nothing;

create or replace function public.is_classendo_email_verified(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classendo_email_verifications ev
    join auth.users au on au.id = ev.user_id
    where ev.user_id = target_user_id
      and ev.verified_at is not null
      and ev.normalized_email = lower(trim(coalesce(au.email, '')))
  );
$$;

revoke all on function public.is_classendo_email_verified(uuid) from public;
grant execute on function public.is_classendo_email_verified(uuid) to authenticated, service_role;

create or replace function public.sync_classendo_email_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(coalesce(new.email, '')));
begin
  if normalized = '' then return new; end if;
  insert into public.classendo_email_verifications (user_id, normalized_email, verified_at)
  values (new.id, normalized, null)
  on conflict (user_id) do update
    set normalized_email = excluded.normalized_email,
        verified_at = case
          when public.classendo_email_verifications.normalized_email = excluded.normalized_email
            then public.classendo_email_verifications.verified_at
          else null
        end,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_sync_classendo_email_verification on auth.users;
create trigger on_auth_user_sync_classendo_email_verification
  after insert or update of email on auth.users
  for each row execute function public.sync_classendo_email_verification();

-- The legacy trigger reserves an address before it is verified. Remove it so
-- an abandoned unverified signup can be cleaned up and retried later.
drop trigger if exists on_auth_user_register_classendo_email on auth.users;
drop trigger if exists on_auth_user_email_confirmed_welcome_trial on auth.users;

create or replace function public.claim_classendo_auth_rate_limit(
  p_action text,
  p_subject_hashes text[],
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  subject text;
begin
  if p_action is null or p_action = '' or p_max_requests < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit request';
  end if;
  foreach subject in array array(select distinct value from unnest(p_subject_hashes) value where value <> '' order by value) loop
    perform pg_advisory_xact_lock(hashtext(p_action || ':' || subject));
    if (select count(*) from public.classendo_auth_rate_limit_events
        where action = p_action and subject_hash = subject
          and created_at > now() - make_interval(secs => p_window_seconds)) >= p_max_requests then
      return false;
    end if;
  end loop;
  insert into public.classendo_auth_rate_limit_events (action, subject_hash)
  select p_action, value from unnest(p_subject_hashes) value where value <> '';
  delete from public.classendo_auth_rate_limit_events where created_at < now() - interval '30 days';
  return true;
end;
$$;

create or replace function public.complete_classendo_email_verification(p_token_hash text)
returns table (user_id uuid, verified boolean, trial_started boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  token_row public.classendo_email_verification_tokens%rowtype;
  claimed_email text;
  trial_granted boolean := false;
begin
  select * into token_row
  from public.classendo_email_verification_tokens
  where token_hash = p_token_hash and used_at is null and invalidated_at is null and expires_at > now()
  for update;
  if not found then
    return query select null::uuid, false, false;
    return;
  end if;

  update public.classendo_email_verification_tokens set used_at = now() where token_hash = p_token_hash;
  update public.classendo_email_verifications
  set normalized_email = token_row.normalized_email, verified_at = now(), updated_at = now()
  where user_id = token_row.user_id;

  insert into public.user_subscriptions (user_id, subscription_status, subscription_tier, premium_trial_used, created_at, updated_at)
  values (token_row.user_id, 'free', 'free', false, now(), now())
  on conflict (user_id) do nothing;

  insert into public.classendo_verified_trial_emails (normalized_email, first_verified_user_id)
  values (token_row.normalized_email, token_row.user_id)
  on conflict (normalized_email) do nothing
  returning normalized_email into claimed_email;

  if claimed_email is not null then
    update public.user_subscriptions
    set premium_trial_started_at = now(), premium_trial_ends_at = now() + interval '14 days',
        premium_trial_used = true, updated_at = now()
    where user_id = token_row.user_id
      and not coalesce(premium_trial_used, false)
      and stripe_subscription_id is null
      and not (lower(coalesce(subscription_tier, 'free')) = 'premium'
               and lower(coalesce(subscription_status, '')) in ('trialing', 'active', 'past_due'));
    trial_granted := found;
  end if;

  return query select token_row.user_id, true, trial_granted;
end;
$$;

revoke all on function public.claim_classendo_auth_rate_limit(text, text[], integer, integer) from public;
revoke all on function public.complete_classendo_email_verification(text) from public;
grant execute on function public.claim_classendo_auth_rate_limit(text, text[], integer, integer) to service_role;
grant execute on function public.complete_classendo_email_verification(text) to service_role;

-- Unverified accounts can use Basic tools, but cannot make public/community
-- content or upload creator content. Existing public rows are untouched.
alter table public.lesson_sets alter column is_public set default false;
drop policy if exists "lesson_sets_verified_publication" on public.lesson_sets;
drop policy if exists "lesson_sets_verified_publication_update" on public.lesson_sets;
create policy "lesson_sets_verified_publication" on public.lesson_sets as restrictive
  for insert to authenticated
  with check (not is_public or public.is_classendo_email_verified(auth.uid()));
create policy "lesson_sets_verified_publication_update" on public.lesson_sets as restrictive
  for update to authenticated
  using (true)
  with check (not is_public or public.is_classendo_email_verified(auth.uid()));

alter table public.game_prompt_sets alter column is_public set default false;
drop policy if exists "game_prompt_sets_verified_publication" on public.game_prompt_sets;
drop policy if exists "game_prompt_sets_verified_publication_update" on public.game_prompt_sets;
create policy "game_prompt_sets_verified_publication" on public.game_prompt_sets as restrictive
  for insert to authenticated
  with check (not is_public or public.is_classendo_email_verified(auth.uid()));
create policy "game_prompt_sets_verified_publication_update" on public.game_prompt_sets as restrictive
  for update to authenticated using (true)
  with check (not is_public or public.is_classendo_email_verified(auth.uid()));

alter table public.worksheets alter column is_public set default false;
drop policy if exists "worksheets_verified_publication" on public.worksheets;
drop policy if exists "worksheets_verified_publication_update" on public.worksheets;
create policy "worksheets_verified_publication" on public.worksheets as restrictive
  for insert to authenticated
  with check (not is_public or public.is_classendo_email_verified(auth.uid()));
create policy "worksheets_verified_publication_update" on public.worksheets as restrictive
  for update to authenticated using (true)
  with check (not is_public or public.is_classendo_email_verified(auth.uid()));

do $$
begin
  if to_regclass('public.creator_images') is not null then
    drop policy if exists "creator_images_insert_own_premium" on public.creator_images;
    create policy "creator_images_insert_own_premium" on public.creator_images for insert to authenticated with check (
      auth.uid() = user_id and public.has_premium_access(auth.uid())
      and public.is_classendo_email_verified(auth.uid()) and storage_path like auth.uid()::text || '/%');
    drop policy if exists "creator_images_update_own_premium" on public.creator_images;
    create policy "creator_images_update_own_premium" on public.creator_images for update to authenticated using (
      auth.uid() = user_id and public.has_premium_access(auth.uid()) and public.is_classendo_email_verified(auth.uid()))
      with check (auth.uid() = user_id and public.has_premium_access(auth.uid())
      and public.is_classendo_email_verified(auth.uid()) and storage_path like auth.uid()::text || '/%');
  end if;
end;
$$;

drop policy if exists "creator_images_storage_insert_own_premium" on storage.objects;
create policy "creator_images_storage_insert_own_premium" on storage.objects for insert to authenticated with check (
  bucket_id = 'creator-images' and (storage.foldername(name))[1] = auth.uid()::text
  and public.has_premium_access(auth.uid()) and public.is_classendo_email_verified(auth.uid()));
