-- Signup and welcome-trial protections for Classendo.
--
-- Apply after premium-welcome-trial.sql. Then, in Supabase Dashboard:
-- Authentication → Hooks → Before User Created → select
-- public.hook_block_disposable_signup.
--
-- The domain list is populated and maintained by
-- `npm run signup-protection:sync-domains`. The hook only reads this private,
-- local snapshot; a visitor's signup never makes a third-party validation call.

create table if not exists public.disposable_email_domains (
  domain text primary key check (domain = lower(trim(domain))),
  source text not null default 'disposable-email-domains',
  last_synced_at timestamptz not null default now()
);

alter table public.disposable_email_domains enable row level security;
revoke all on public.disposable_email_domains from anon, authenticated;

create table if not exists public.signup_rejection_events (
  id bigint generated always as identity primary key,
  domain text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists signup_rejection_events_created_at_idx
  on public.signup_rejection_events (created_at desc);

alter table public.signup_rejection_events enable row level security;
revoke all on public.signup_rejection_events from anon, authenticated;

-- This is a Supabase Before User Created Postgres Auth Hook. It deliberately
-- records only a timestamp, domain, and reason: never a full email or password.
create or replace function public.hook_block_disposable_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_domain text := lower(trim(split_part(coalesce(event -> 'user' ->> 'email', ''), '@', 2)));
begin
  if candidate_domain <> '' and exists (
    select 1
    from public.disposable_email_domains
    where domain = candidate_domain
  ) then
    insert into public.signup_rejection_events (domain, reason)
    values (candidate_domain, 'disposable_email_domain');

    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 400,
        'message', 'Please use a permanent email address. Temporary email providers are not supported.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_block_disposable_signup(jsonb)
  to supabase_auth_admin;
revoke execute on function public.hook_block_disposable_signup(jsonb)
  from authenticated, anon, public;

-- New accounts receive a free subscription record at creation, but no trial.
-- Email confirmation is the only event that can start Classendo's welcome trial.
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
    premium_trial_used,
    created_at,
    updated_at
  ) values (
    new.id,
    'free',
    'free',
    false,
    now(),
    now()
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.start_classendo_welcome_trial_after_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Never replace paid Stripe access or grant a second Classendo trial.
  update public.user_subscriptions
  set premium_trial_started_at = now(),
      premium_trial_ends_at = now() + interval '14 days',
      premium_trial_used = true,
      updated_at = now()
  where user_id = new.id
    and not coalesce(premium_trial_used, false)
    and stripe_subscription_id is null
    and not (
      lower(coalesce(subscription_tier, 'free')) = 'premium'
      and lower(coalesce(subscription_status, '')) in ('trialing', 'active', 'past_due')
    );

  -- A subscription row is normally created by the auth-user trigger above.
  -- This fallback keeps the confirmation flow robust if a row was removed.
  insert into public.user_subscriptions (
    user_id,
    subscription_status,
    subscription_tier,
    premium_trial_started_at,
    premium_trial_ends_at,
    premium_trial_used,
    created_at,
    updated_at
  )
  select new.id, 'free', 'free', now(), now() + interval '14 days', true, now(), now()
  where not exists (
    select 1 from public.user_subscriptions where user_id = new.id
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed_welcome_trial on auth.users;
create trigger on_auth_user_email_confirmed_welcome_trial
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.start_classendo_welcome_trial_after_email_confirmation();

-- Existing RLS rules already only allow users to read their subscription. Keep
-- this trigger as a second guard if a future policy accidentally allows updates.
create or replace function public.prevent_welcome_trial_reset()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    new.premium_trial_used is distinct from old.premium_trial_used
    or new.premium_trial_started_at is distinct from old.premium_trial_started_at
    or new.premium_trial_ends_at is distinct from old.premium_trial_ends_at
  ) then
    raise exception 'Premium welcome trial state is managed by Classendo.';
  end if;

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
