-- Classendo-owned 14-day Premium welcome trial and non-destructive Basic downgrade state.
-- Run after profile-auth-migration.sql and stripe-subscriptions.sql.

alter table public.user_subscriptions
  add column if not exists premium_trial_started_at timestamptz,
  add column if not exists premium_trial_ends_at timestamptz,
  add column if not exists premium_trial_used boolean not null default false,
  add column if not exists premium_trial_expiry_seen_at timestamptz,
  add column if not exists basic_lesson_access_assigned_at timestamptz;

alter table public.lesson_sets
  add column if not exists basic_active boolean not null default true,
  add column if not exists basic_locked_at timestamptz;

alter table public.cards
  add column if not exists basic_back_override text,
  add column if not exists basic_converted_at timestamptz;

-- This private registry survives account deletion and prevents a previously used
-- email from receiving another account/trial. Supabase Auth remains the password
-- and identity provider; this table stores no credentials.
create table if not exists public.account_email_registry (
  normalized_email text primary key,
  first_user_id uuid not null,
  first_registered_at timestamptz not null default now()
);

alter table public.account_email_registry enable row level security;
revoke all on public.account_email_registry from anon, authenticated;

insert into public.account_email_registry (normalized_email, first_user_id, first_registered_at)
select lower(trim(email)), id, coalesce(created_at, now())
from auth.users
where email is not null and trim(email) <> ''
on conflict (normalized_email) do nothing;

create or replace function public.register_classendo_account_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(coalesce(new.email, '')));
  registered_user_id uuid;
begin
  if normalized = '' then
    return new;
  end if;

  select first_user_id into registered_user_id
  from public.account_email_registry
  where normalized_email = normalized;

  if registered_user_id is not null and registered_user_id <> new.id then
    raise exception using
      errcode = '23505',
      message = 'An account already exists with this email address. Please sign in instead.';
  end if;

  insert into public.account_email_registry (normalized_email, first_user_id)
  values (normalized, new.id)
  on conflict (normalized_email) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_register_classendo_email on auth.users;
create trigger on_auth_user_register_classendo_email
  before insert or update of email on auth.users
  for each row execute function public.register_classendo_account_email();

create or replace function public.start_classendo_welcome_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_subscriptions (
    user_id,
    subscription_status,
    subscription_tier,
    premium_trial_started_at,
    premium_trial_ends_at,
    premium_trial_used,
    created_at,
    updated_at
  ) values (
    new.id,
    'free',
    'free',
    now(),
    now() + interval '14 days',
    true,
    now(),
    now()
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_welcome_trial on auth.users;
create trigger on_auth_user_created_welcome_trial
  after insert on auth.users
  for each row execute function public.start_classendo_welcome_trial();

create or replace function public.prevent_welcome_trial_reset()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.premium_trial_used and not new.premium_trial_used then
    raise exception 'The Premium welcome trial cannot be reset.';
  end if;
  if old.premium_trial_used and (
    new.premium_trial_started_at is distinct from old.premium_trial_started_at
    or new.premium_trial_ends_at is distinct from old.premium_trial_ends_at
  ) then
    raise exception 'The Premium welcome trial dates cannot be changed after use.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_welcome_trial_reset_on_subscriptions on public.user_subscriptions;
create trigger prevent_welcome_trial_reset_on_subscriptions
  before update on public.user_subscriptions
  for each row execute function public.prevent_welcome_trial_reset();

create or replace function public.has_premium_access(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.user_subscriptions us
      where us.user_id = target_user_id
        and (
          (
            lower(coalesce(us.subscription_tier, 'free')) = 'premium'
            and lower(coalesce(us.subscription_status, '')) in ('trialing', 'active', 'past_due')
          )
          or (
            us.premium_trial_used
            and us.premium_trial_started_at is not null
            and us.premium_trial_ends_at > now()
          )
        )
    )
    or exists (
      select 1
      from public.admin_user_entitlements aue
      where aue.user_id = target_user_id
        and aue.entitlement = 'premium'
        and aue.revoked_at is null
        and (aue.expires_at is null or aue.expires_at > now())
    );
$$;

revoke all on function public.has_premium_access(uuid)
  from public, anon, authenticated;
grant execute on function public.has_premium_access(uuid)
  to authenticated, service_role;

-- Assign the six most recently used/updated sets once on entry to Basic. The
-- assignment remains stable, preventing unlimited rotation of locked sets.
create or replace function public.reconcile_basic_lesson_set_access(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.has_premium_access(target_user_id) then
    return;
  end if;

  insert into public.user_subscriptions (user_id, subscription_status, subscription_tier)
  values (target_user_id, 'free', 'free')
  on conflict (user_id) do nothing;

  if exists (
    select 1 from public.user_subscriptions
    where user_id = target_user_id and basic_lesson_access_assigned_at is not null
  ) then
    return;
  end if;

  with ranked as (
    select id, row_number() over (
      order by coalesce(last_used, created_at) desc, created_at desc, id desc
    ) as position
    from public.lesson_sets
    where user_id = target_user_id
  )
  update public.lesson_sets ls
  set basic_active = ranked.position <= 6,
      basic_locked_at = case when ranked.position <= 6 then null else now() end
  from ranked
  where ls.id = ranked.id;

  update public.user_subscriptions
  set basic_lesson_access_assigned_at = now(), updated_at = now()
  where user_id = target_user_id;
end;
$$;

revoke all on function public.reconcile_basic_lesson_set_access(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_basic_lesson_set_access(uuid) to service_role;

-- Basic accounts may create sets only while fewer than six active sets exist.
create or replace function public.enforce_free_lesson_set_save_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  lesson_count integer;
begin
  if public.has_premium_access(new.user_id) then
    return new;
  end if;

  select count(*) into lesson_count
  from public.lesson_sets ls
  where ls.user_id = new.user_id
    and ls.basic_active
    and ls.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if lesson_count >= 6 then
    raise exception 'Basic accounts can have up to 6 active lesson sets. Upgrade to Premium for unlimited sets.';
  end if;

  new.basic_active := true;
  new.basic_locked_at := null;
  return new;
end;
$$;

create index if not exists lesson_sets_basic_access_idx
  on public.lesson_sets (user_id, basic_active, last_used desc);

create index if not exists cards_basic_conversion_idx
  on public.cards (lesson_set_id)
  where basic_back_override is not null;

-- Downgrade flags and Basic image overrides are server-managed. Existing owner
-- policies can continue updating normal lesson/card fields without allowing a
-- client to unlock sets or forge a conversion.
create or replace function public.protect_basic_lesson_access_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    new.basic_active is distinct from old.basic_active
    or new.basic_locked_at is distinct from old.basic_locked_at
  ) then
    raise exception 'Basic lesson access state is managed by Classendo.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_basic_lesson_access_on_sets on public.lesson_sets;
create trigger protect_basic_lesson_access_on_sets
  before update on public.lesson_sets
  for each row execute function public.protect_basic_lesson_access_fields();

create or replace function public.protect_basic_card_override_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    new.basic_back_override is distinct from old.basic_back_override
    or new.basic_converted_at is distinct from old.basic_converted_at
  ) then
    raise exception 'Basic card conversion state is managed by Classendo.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_basic_card_overrides on public.cards;
create trigger protect_basic_card_overrides
  before update on public.cards
  for each row execute function public.protect_basic_card_override_fields();
