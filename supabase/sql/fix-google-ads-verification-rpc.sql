-- Preserve the Google Ads conversion receipt return value while qualifying
-- PL/pgSQL predicates. The function's OUT parameter `user_id` otherwise
-- collides with unqualified table columns during email verification.

create or replace function public.complete_classendo_email_verification(p_token_hash text)
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

  update public.classendo_email_verification_tokens
  set used_at = now()
  where classendo_email_verification_tokens.token_hash = p_token_hash;

  update public.classendo_email_verifications as verification
  set normalized_email = token_row.normalized_email, verified_at = now(), updated_at = now()
  where verification.user_id = token_row.user_id;

  insert into public.user_subscriptions (user_id, subscription_status, subscription_tier, premium_trial_used, created_at, updated_at)
  values (token_row.user_id, 'free', 'free', false, now(), now())
  on conflict on constraint user_subscriptions_pkey do nothing;

  insert into public.classendo_verified_trial_emails (normalized_email, first_verified_user_id)
  values (token_row.normalized_email, token_row.user_id)
  on conflict (normalized_email) do nothing
  returning normalized_email into claimed_email;

  if claimed_email is not null then
    update public.user_subscriptions as subscription
    set premium_trial_started_at = now(), premium_trial_ends_at = now() + interval '14 days',
        premium_trial_used = true, updated_at = now()
    where subscription.user_id = token_row.user_id
      and not coalesce(subscription.premium_trial_used, false)
      and subscription.stripe_subscription_id is null
      and not (lower(coalesce(subscription.subscription_tier, 'free')) = 'premium'
               and lower(coalesce(subscription.subscription_status, '')) in ('trialing', 'active', 'past_due'));
    trial_granted := found;
  end if;

  update public.classendo_email_verifications as verification
  set signup_conversion_claimed_at = now(), updated_at = now()
  where verification.user_id = token_row.user_id
    and verification.signup_conversion_id is not null
    and verification.signup_conversion_claimed_at is null
  returning verification.signup_conversion_id into conversion_receipt;

  return query select token_row.user_id, true, trial_granted, conversion_receipt;
end;
$$;

revoke all on function public.complete_classendo_email_verification(text) from public;
grant execute on function public.complete_classendo_email_verification(text) to service_role;
