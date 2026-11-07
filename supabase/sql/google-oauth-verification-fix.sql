-- Google verification/trial reconciliation for the GIS sign-in flow.
-- Prepared locally; requires explicit approval before production application.

create or replace function public.get_classendo_verification_grace(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'verified', coalesce(
      v.verified_at is not null and v.normalized_email = lower(trim(coalesce(u.email, ''))), false
    ) or (u.raw_app_meta_data ->> 'provider' = 'google' and u.email_confirmed_at is not null),
    'email', u.email,
    'verifiedAt', case
      when v.verified_at is not null and v.normalized_email = lower(trim(coalesce(u.email, ''))) then v.verified_at
      when u.raw_app_meta_data ->> 'provider' = 'google' and u.email_confirmed_at is not null then u.email_confirmed_at
    end,
    'deadline', case
      when p.activated_at is null
        or v.verified_at is not null and v.normalized_email = lower(trim(coalesce(u.email, '')))
        or u.raw_app_meta_data ->> 'provider' = 'google' and u.email_confirmed_at is not null then null
      else greatest(u.created_at, p.activated_at) + interval '21 days'
    end,
    'serverNow', now(),
    'activatedAt', p.activated_at
  )
  from auth.users u
  cross join public.classendo_verification_policy p
  left join public.classendo_email_verifications v on v.user_id = u.id
  where u.id = p_user_id and p.id = true;
$$;
revoke all on function public.get_classendo_verification_grace(uuid) from public, anon, authenticated;
grant execute on function public.get_classendo_verification_grace(uuid) to service_role;

create or replace function public.classendo_account_within_verification_grace(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    cross join public.classendo_verification_policy p
    left join public.classendo_email_verifications v on v.user_id = u.id
    where u.id = target_user_id and p.id = true
      and (auth.uid() = target_user_id
        or current_setting('request.jwt.claim.role', true) = 'service_role')
      and (
        u.raw_app_meta_data ->> 'provider' = 'google' and u.email_confirmed_at is not null
        or p.activated_at is null
        or (v.verified_at is not null and v.normalized_email = lower(trim(coalesce(u.email, ''))))
        or now() < greatest(u.created_at, p.activated_at) + interval '21 days'
      )
  );
$$;
revoke all on function public.classendo_account_within_verification_grace(uuid) from public, anon;
grant execute on function public.classendo_account_within_verification_grace(uuid) to authenticated, service_role;

-- This runs only after authenticated, fully onboarded Google accounts return to
-- the server. It does not create signup/conversion receipts and only grants a
-- trial if the unique verified-email claim and all existing subscription guards
-- allow it.
create or replace function public.reconcile_classendo_google_verification(p_user_id uuid)
returns table (completed boolean, trial_started boolean, signup_conversion_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
<<reconcile_fn>>
declare
  user_row auth.users%rowtype;
  profile_row public.profiles%rowtype;
  v_email text;
  claimed_email text;
  claim_owner uuid;
  claim_created boolean := false;
  subscription_row public.user_subscriptions%rowtype;
  trial_granted boolean := false;
begin
  select * into user_row from auth.users where id = p_user_id for update;
  v_email := lower(trim(coalesce(user_row.email, '')));
  if user_row.id is null or user_row.raw_app_meta_data ->> 'provider' is distinct from 'google'
    or user_row.email_confirmed_at is null or v_email = '' then
    return query select false, false, null::uuid; return;
  end if;

  select * into profile_row from public.profiles where id = p_user_id;
  if profile_row.id is null or nullif(trim(profile_row.username), '') is null
    or nullif(trim(profile_row.country_region), '') is null
    or profile_row.user_type is null
    or profile_row.user_type not in ('Teacher', 'Online tutor', 'Student', 'Parent', 'Other')
    or user_row.raw_user_meta_data ->> 'age_confirmed' is distinct from 'true'
    or nullif(user_row.raw_user_meta_data ->> 'terms_accepted_at', '') is null
    or nullif(user_row.raw_user_meta_data ->> 'terms_version', '') is null
    or nullif(user_row.raw_user_meta_data ->> 'privacy_notice_version', '') is null then
    return query select false, false, null::uuid; return;
  end if;

  insert into public.classendo_email_verifications(user_id, normalized_email, verified_at, updated_at)
  values (p_user_id, v_email, user_row.email_confirmed_at, now())
  on conflict (user_id) do update set
    normalized_email = excluded.normalized_email,
    verified_at = case
      when public.classendo_email_verifications.normalized_email = excluded.normalized_email
        then coalesce(public.classendo_email_verifications.verified_at, excluded.verified_at)
      else excluded.verified_at
    end,
    updated_at = now()
  where public.classendo_email_verifications.normalized_email is distinct from excluded.normalized_email
    or public.classendo_email_verifications.verified_at is null;

  insert into public.user_subscriptions(user_id, subscription_status, subscription_tier, premium_trial_used, created_at, updated_at)
  values (p_user_id, 'free', 'free', false, now(), now()) on conflict (user_id) do nothing;

  select * into subscription_row from public.user_subscriptions
  where user_id = p_user_id for update;

  if coalesce(subscription_row.premium_trial_used, false)
    or subscription_row.premium_trial_started_at is not null
    or subscription_row.premium_trial_ends_at is not null
    or subscription_row.stripe_subscription_id is not null
    or (lower(coalesce(subscription_row.subscription_tier, 'free')) = 'premium'
      and lower(coalesce(subscription_row.subscription_status, '')) in ('trialing', 'active', 'past_due')) then
    -- Preserve the global email reservation when prior trial/payment history
    -- makes this account ineligible, so another account cannot reuse it.
    insert into public.classendo_verified_trial_emails(normalized_email, first_verified_user_id)
    values (v_email, p_user_id) on conflict (normalized_email) do nothing;
  else
    insert into public.classendo_verified_trial_emails(normalized_email, first_verified_user_id)
    values (v_email, p_user_id) on conflict (normalized_email) do nothing
    returning normalized_email into claimed_email;
    claim_created := claimed_email is not null;
    if claimed_email is null then
      select first_verified_user_id into claim_owner
      from public.classendo_verified_trial_emails c where c.normalized_email = reconcile_fn.v_email;
      if claim_owner = p_user_id then claimed_email := v_email; end if;
    end if;
  end if;

  if claimed_email is not null then
    update public.user_subscriptions set premium_trial_started_at = now(),
      premium_trial_ends_at = now() + interval '14 days', premium_trial_used = true, updated_at = now()
    where user_id = p_user_id and not coalesce(premium_trial_used, false)
      and premium_trial_started_at is null and premium_trial_ends_at is null
      and stripe_subscription_id is null
      and not (lower(coalesce(subscription_tier, 'free')) = 'premium'
        and lower(coalesce(subscription_status, '')) in ('trialing', 'active', 'past_due'));
    trial_granted := found;
    if not trial_granted and claim_created then
      delete from public.classendo_verified_trial_emails
      where normalized_email = reconcile_fn.v_email
        and first_verified_user_id = p_user_id;
    end if;
  end if;

  return query select true, trial_granted, null::uuid;
end;
$$;
revoke all on function public.reconcile_classendo_google_verification(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_classendo_google_verification(uuid) to service_role;

-- Existing pre-migration Google Auth rows may lack an intent because the
-- auth.users INSERT trigger was added later. Create an intent at completion
-- time only for a verified Google account whose Classendo onboarding is still
-- incomplete. Such a legacy completion must not create a fresh Ads receipt.
-- Completed accounts and email/password accounts remain untouched.
create or replace function public.complete_classendo_google_signup(
  p_user_id uuid,
  p_username text,
  p_country_region text,
  p_user_type text,
  p_legal_version text,
  p_signup_attribution jsonb default null
)
returns table (completed boolean, trial_started boolean, signup_conversion_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
<<complete_fn>>
declare
  intent public.classendo_google_signup_intents%rowtype;
  user_row auth.users%rowtype;
  profile_row public.profiles%rowtype;
  v_email text;
  claimed_email text;
  claim_owner uuid;
  claim_created boolean := false;
  subscription_row public.user_subscriptions%rowtype;
  conversion_receipt uuid;
  conversion_eligible boolean := true;
  trial_granted boolean := false;
begin
  select * into user_row from auth.users where id = p_user_id for update;
  v_email := lower(trim(coalesce(user_row.email, '')));
  if user_row.id is null or user_row.email_confirmed_at is null
    or user_row.raw_app_meta_data ->> 'provider' is distinct from 'google'
    or v_email = '' then
    return query select false, false, null::uuid; return;
  end if;

  select * into intent from public.classendo_google_signup_intents where user_id = p_user_id for update;
  if not found then
    conversion_eligible := false;
    select * into profile_row from public.profiles where id = p_user_id;
    if user_row.raw_user_meta_data ->> 'classendo_onboarding_completed_at' is not null
      or (profile_row.id is not null
        and nullif(trim(profile_row.username), '') is not null
        and nullif(trim(profile_row.country_region), '') is not null
        and profile_row.user_type in ('Teacher', 'Online tutor', 'Student', 'Parent', 'Other')
        and user_row.raw_user_meta_data ->> 'age_confirmed' = 'true'
        and nullif(user_row.raw_user_meta_data ->> 'terms_accepted_at', '') is not null
        and nullif(user_row.raw_user_meta_data ->> 'terms_version', '') is not null
        and nullif(user_row.raw_user_meta_data ->> 'privacy_notice_version', '') is not null) then
      return query select false, false, null::uuid; return;
    end if;
    insert into public.classendo_google_signup_intents(user_id) values (p_user_id)
      on conflict (user_id) do nothing;
    select * into intent from public.classendo_google_signup_intents where user_id = p_user_id for update;
  end if;
  if intent.completed_at is not null then return query select true, false, null::uuid; return; end if;

  if p_username is null or p_username !~ '^[a-z0-9_-]{3,24}$'
    or nullif(trim(p_country_region), '') is null
    or p_user_type is null or p_user_type not in ('Teacher', 'Online tutor', 'Student', 'Parent', 'Other')
    or p_legal_version is null then
    return query select false, false, null::uuid; return;
  end if;
  if exists (select 1 from public.profiles p where lower(p.username) = lower(p_username) and p.id <> p_user_id) then
    raise exception 'That username is already taken.' using errcode = '23505';
  end if;

  update public.profiles set username = p_username, display_name = p_username,
    country_region = trim(p_country_region), user_type = p_user_type where id = p_user_id;
  if not found then
    insert into public.profiles(id, username, display_name, country_region, user_type, created_at)
    values (p_user_id, p_username, p_username, trim(p_country_region), p_user_type, now());
  end if;

  update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) ||
    jsonb_build_object('username', p_username, 'country_region', trim(p_country_region),
      'user_type', p_user_type, 'age_confirmed', true, 'terms_accepted_at', now(),
      'terms_version', p_legal_version, 'privacy_notice_version', p_legal_version,
      'classendo_onboarding_completed_at', now(),
      'signup_attribution', coalesce(p_signup_attribution, 'null'::jsonb)) where id = p_user_id;

  insert into public.classendo_email_verifications(user_id, normalized_email, verified_at, updated_at)
  values (p_user_id, v_email, user_row.email_confirmed_at, now())
  on conflict (user_id) do update set normalized_email = excluded.normalized_email,
    verified_at = case
      when public.classendo_email_verifications.normalized_email = excluded.normalized_email
        then coalesce(public.classendo_email_verifications.verified_at, excluded.verified_at)
      else excluded.verified_at
    end,
    updated_at = now();

  insert into public.user_subscriptions(user_id, subscription_status, subscription_tier, premium_trial_used, created_at, updated_at)
  values (p_user_id, 'free', 'free', false, now(), now()) on conflict (user_id) do nothing;
  select * into subscription_row from public.user_subscriptions
  where user_id = p_user_id for update;

  if coalesce(subscription_row.premium_trial_used, false)
    or subscription_row.premium_trial_started_at is not null
    or subscription_row.premium_trial_ends_at is not null
    or subscription_row.stripe_subscription_id is not null
    or (lower(coalesce(subscription_row.subscription_tier, 'free')) = 'premium'
      and lower(coalesce(subscription_row.subscription_status, '')) in ('trialing', 'active', 'past_due')) then
    insert into public.classendo_verified_trial_emails(normalized_email, first_verified_user_id)
    values (v_email, p_user_id) on conflict (normalized_email) do nothing;
  else
    insert into public.classendo_verified_trial_emails(normalized_email, first_verified_user_id)
    values (v_email, p_user_id) on conflict (normalized_email) do nothing
    returning normalized_email into claimed_email;
    claim_created := claimed_email is not null;
    if claimed_email is null then
      select first_verified_user_id into claim_owner
      from public.classendo_verified_trial_emails c where c.normalized_email = complete_fn.v_email;
      if claim_owner = p_user_id then claimed_email := v_email; end if;
    end if;
  end if;

  if claimed_email is not null then
    update public.user_subscriptions set premium_trial_started_at = now(),
      premium_trial_ends_at = now() + interval '14 days', premium_trial_used = true, updated_at = now()
    where user_id = p_user_id and not coalesce(premium_trial_used, false)
      and premium_trial_started_at is null and premium_trial_ends_at is null
      and stripe_subscription_id is null
      and not (lower(coalesce(subscription_tier, 'free')) = 'premium'
        and lower(coalesce(subscription_status, '')) in ('trialing', 'active', 'past_due'));
    trial_granted := found;
    if not trial_granted and claim_created then
      delete from public.classendo_verified_trial_emails
      where normalized_email = complete_fn.v_email
        and first_verified_user_id = p_user_id;
    end if;
  end if;

  if conversion_eligible then
    update public.classendo_email_verifications set
      signup_conversion_id = coalesce(signup_conversion_id, intent.conversion_id),
      signup_conversion_claimed_at = now(), updated_at = now()
      where user_id = p_user_id and signup_conversion_claimed_at is null
      returning signup_conversion_id into conversion_receipt;
  end if;
  update public.classendo_google_signup_intents set completed_at = now() where user_id = p_user_id;
  return query select true, trial_granted, conversion_receipt;
end;
$$;
revoke all on function public.complete_classendo_google_signup(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_classendo_google_signup(uuid, text, text, text, text, jsonb) to service_role;
