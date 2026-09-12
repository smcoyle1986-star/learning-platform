-- Fire the Google Ads signup conversion only after Classendo has verified the
-- address. The receipt is issued only for a fresh email identity and can be
-- claimed once, even if the verification link is opened on another device.

alter table public.classendo_email_verifications
  add column if not exists signup_conversion_id uuid,
  add column if not exists signup_conversion_claimed_at timestamptz;

-- PostgreSQL does not allow CREATE OR REPLACE to change a function's returned
-- table shape, so replace the service-role-only verification RPC explicitly.
drop function if exists public.complete_classendo_email_verification(text);

create function public.complete_classendo_email_verification(p_token_hash text)
returns table (
  user_id uuid,
  verified boolean,
  trial_started boolean,
  signup_conversion_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  token_row public.classendo_email_verification_tokens%rowtype;
  claimed_email text;
  conversion_receipt uuid;
  trial_granted boolean := false;
begin
  select * into token_row
  from public.classendo_email_verification_tokens
  where token_hash = p_token_hash and used_at is null and invalidated_at is null and expires_at > now()
  for update;
  if not found then
    return query select null::uuid, false, false, null::uuid;
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

  -- Release the fresh-signup receipt exactly once. A later email change and
  -- re-verification cannot create a second Google Ads signup conversion.
  update public.classendo_email_verifications
  set signup_conversion_claimed_at = now(), updated_at = now()
  where user_id = token_row.user_id
    and signup_conversion_id is not null
    and signup_conversion_claimed_at is null
  returning signup_conversion_id into conversion_receipt;

  return query select token_row.user_id, true, trial_granted, conversion_receipt;
end;
$$;

revoke all on function public.complete_classendo_email_verification(text) from public;
grant execute on function public.complete_classendo_email_verification(text) to service_role;
