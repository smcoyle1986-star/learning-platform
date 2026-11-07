-- Remove the legacy verification deadline without changing any user,
-- subscription, trial, lesson, worksheet, or verification-history rows.
-- Apply alongside the application release. Premium checkout and sensitive
-- action checks continue to use verified-email requirements in application
-- routes and their existing database policies.

create or replace function public.get_classendo_verification_grace(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'verified', coalesce(
      (v.verified_at is not null and v.normalized_email = lower(trim(coalesce(u.email, ''))))
      or (u.raw_app_meta_data ->> 'provider' = 'google' and u.email_confirmed_at is not null),
      false
    ),
    'email', u.email,
    'verifiedAt', case
      when v.verified_at is not null and v.normalized_email = lower(trim(coalesce(u.email, ''))) then v.verified_at
      when u.raw_app_meta_data ->> 'provider' = 'google' and u.email_confirmed_at is not null then u.email_confirmed_at
    end,
    'deadline', null,
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

-- Preserve the helper's caller boundary. This helper now expresses only that
-- the caller may access their own account (or is the service role); it no
-- longer imposes a date-based lockout on Free accounts.
create or replace function public.classendo_account_within_verification_grace(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = auth.uid()
    or current_setting('request.jwt.claim.role', true) = 'service_role';
$$;
revoke all on function public.classendo_account_within_verification_grace(uuid) from public, anon;
grant execute on function public.classendo_account_within_verification_grace(uuid) to authenticated, service_role;
