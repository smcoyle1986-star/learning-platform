-- Google OAuth onboarding and verified-email trial completion.
-- Apply after analytics-identity-overhaul.sql, seamless-signup-verification.sql,
-- google-ads-signup-conversion.sql, and email-verification-grace.sql.
-- This migration is intentionally not applied by the local implementation task.

create table if not exists public.classendo_google_signup_intents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  conversion_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.classendo_google_signup_intents enable row level security;
revoke all on public.classendo_google_signup_intents from public, anon, authenticated;
grant select, insert, update, delete on public.classendo_google_signup_intents to service_role;

create or replace function public.track_new_google_signup_intent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.raw_app_meta_data ->> 'provider' = 'google'
     and new.email_confirmed_at is not null then
    insert into public.classendo_google_signup_intents(user_id)
    values (new.id) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.track_new_google_signup_intent() from public, anon, authenticated;
drop trigger if exists on_auth_user_google_signup_intent on auth.users;
create trigger on_auth_user_google_signup_intent
  after insert on auth.users for each row execute function public.track_new_google_signup_intent();

create or replace function public.get_classendo_google_signup_state(p_user_id uuid)
returns table (onboarding_required boolean)
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.classendo_google_signup_intents i
    where i.user_id = p_user_id and i.completed_at is null
  );
$$;
revoke all on function public.get_classendo_google_signup_state(uuid) from public, anon, authenticated;
grant execute on function public.get_classendo_google_signup_state(uuid) to service_role;

create or replace function public.complete_classendo_google_signup(
  p_user_id uuid,
  p_username text,
  p_country_region text,
  p_user_type text,
  p_legal_version text,
  p_signup_attribution jsonb default null
)
returns table (completed boolean, trial_started boolean, signup_conversion_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  intent public.classendo_google_signup_intents%rowtype;
  user_row auth.users%rowtype;
  normalized_email text;
  claimed_email text;
  conversion_receipt uuid;
  trial_granted boolean := false;
begin
  select * into intent from public.classendo_google_signup_intents
    where user_id = p_user_id for update;
  if not found then return query select false, false, null::uuid; return; end if;
  if intent.completed_at is not null then return query select true, false, null::uuid; return; end if;

  select * into user_row from auth.users where id = p_user_id for update;
  normalized_email := lower(trim(coalesce(user_row.email, '')));
  if user_row.id is null or user_row.email_confirmed_at is null
    or user_row.raw_app_meta_data ->> 'provider' is distinct from 'google'
    or normalized_email = ''
    or p_username is null or p_username !~ '^[a-z0-9_-]{3,24}$'
    or nullif(trim(p_country_region), '') is null
    or p_user_type is null or p_user_type not in ('Teacher', 'Online tutor', 'Student', 'Parent', 'Other')
    or p_legal_version is null then
    return query select false, false, null::uuid; return;
  end if;

  if exists (select 1 from public.profiles p where lower(p.username) = lower(p_username) and p.id <> p_user_id) then
    raise exception 'That username is already taken.' using errcode = '23505';
  end if;

  update public.profiles set username = p_username, display_name = p_username,
    country_region = trim(p_country_region), user_type = p_user_type
    where id = p_user_id;
  if not found then
    insert into public.profiles(id, username, display_name, country_region, user_type, created_at)
    values (p_user_id, p_username, p_username, trim(p_country_region), p_user_type, now());
  end if;

  update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) ||
    jsonb_build_object('username', p_username, 'country_region', trim(p_country_region),
      'user_type', p_user_type, 'age_confirmed', true,
      'terms_accepted_at', now(), 'terms_version', p_legal_version,
      'privacy_notice_version', p_legal_version, 'classendo_onboarding_completed_at', now(),
      'signup_attribution', coalesce(p_signup_attribution, 'null'::jsonb))
    where id = p_user_id;

  insert into public.classendo_email_verifications(user_id, normalized_email, verified_at, updated_at)
  values (p_user_id, normalized_email, now(), now())
  on conflict (user_id) do update set normalized_email = excluded.normalized_email,
    verified_at = coalesce(public.classendo_email_verifications.verified_at, excluded.verified_at),
    updated_at = now();

  insert into public.user_subscriptions(user_id, subscription_status, subscription_tier, premium_trial_used, created_at, updated_at)
  values (p_user_id, 'free', 'free', false, now(), now()) on conflict (user_id) do nothing;

  insert into public.classendo_verified_trial_emails(normalized_email, first_verified_user_id)
  values (normalized_email, p_user_id) on conflict (normalized_email) do nothing
  returning normalized_email into claimed_email;

  if claimed_email is not null then
    update public.user_subscriptions set premium_trial_started_at = now(),
      premium_trial_ends_at = now() + interval '14 days', premium_trial_used = true, updated_at = now()
    where user_id = p_user_id and not coalesce(premium_trial_used, false)
      and premium_trial_started_at is null and premium_trial_ends_at is null
      and stripe_subscription_id is null
      and not (lower(coalesce(subscription_tier, 'free')) = 'premium'
        and lower(coalesce(subscription_status, '')) in ('trialing', 'active', 'past_due'));
    trial_granted := found;
  end if;

  update public.classendo_email_verifications set
    signup_conversion_id = coalesce(signup_conversion_id, intent.conversion_id),
    signup_conversion_claimed_at = now(), updated_at = now()
    where user_id = p_user_id and signup_conversion_claimed_at is null
    returning signup_conversion_id into conversion_receipt;
  update public.classendo_google_signup_intents set completed_at = now() where user_id = p_user_id;
  return query select true, trial_granted, conversion_receipt;
end;
$$;
revoke all on function public.complete_classendo_google_signup(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_classendo_google_signup(uuid, text, text, text, text, jsonb) to service_role;
