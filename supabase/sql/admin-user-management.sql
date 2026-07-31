-- Classendo administrator user directory, detail views, and complimentary
-- premium access. All administrative functions are service-role only.

create table if not exists public.admin_user_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  entitlement text not null default 'premium'
    check (entitlement = 'premium'),
  reason text not null check (char_length(btrim(reason)) between 5 and 500),
  expires_at timestamptz,
  granted_at timestamptz not null default now(),
  granted_by uuid not null references auth.users (id) on delete restrict,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > granted_at)
);

comment on table public.admin_user_entitlements is
  'Complimentary platform access granted by a Classendo owner. Stripe subscription records remain authoritative for paid billing.';

alter table public.admin_user_entitlements enable row level security;

revoke all on table public.admin_user_entitlements from anon, authenticated;
grant all on table public.admin_user_entitlements to service_role;

create index if not exists admin_user_entitlements_active_idx
  on public.admin_user_entitlements (expires_at)
  where revoked_at is null;

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
         and lower(coalesce(us.subscription_tier, 'free')) = 'premium'
         and lower(coalesce(us.subscription_status, '')) in ('trialing', 'active', 'past_due')
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

create or replace function public.get_admin_users(
  search_query text default '',
  role_filter text default 'all',
  tier_filter text default 'all',
  status_filter text default 'all',
  page_size integer default 25,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_size integer := least(greatest(coalesce(page_size, 25), 1), 100);
  safe_offset integer := greatest(coalesce(page_offset, 0), 0);
  normalized_search text := lower(btrim(coalesce(search_query, '')));
  normalized_role text := lower(coalesce(role_filter, 'all'));
  normalized_tier text := lower(coalesce(tier_filter, 'all'));
  normalized_status text := lower(coalesce(status_filter, 'all'));
  total_count bigint := 0;
  rows_json jsonb := '[]'::jsonb;
begin
  with users_base as (
    select
      au.id,
      au.email,
      au.created_at,
      au.last_sign_in_at,
      au.banned_until,
      p.username,
      p.display_name,
      p.avatar_url,
      coalesce(am.role, 'user') as account_role,
      us.subscription_tier,
      us.subscription_status,
      us.current_period_end,
      (
        lower(coalesce(us.subscription_tier, 'free')) = 'premium'
        and lower(coalesce(us.subscription_status, '')) in ('trialing', 'active', 'past_due')
      ) as has_stripe_premium,
      (
        aue.user_id is not null
        and aue.revoked_at is null
        and (aue.expires_at is null or aue.expires_at > now())
      ) as has_complimentary_premium,
      aue.expires_at as complimentary_expires_at
    from auth.users au
    left join public.profiles p on p.id = au.id
    left join public.admin_memberships am on am.user_id = au.id
    left join public.user_subscriptions us on us.user_id = au.id
    left join public.admin_user_entitlements aue on aue.user_id = au.id
  ),
  filtered as (
    select *,
      case
        when has_stripe_premium or has_complimentary_premium then 'premium'
        else 'free'
      end as effective_tier,
      case
        when banned_until is not null and banned_until > now() then 'suspended'
        when has_complimentary_premium and not has_stripe_premium then 'complimentary'
        when has_stripe_premium then lower(coalesce(subscription_status, 'active'))
        else 'free'
      end as effective_status
    from users_base
    where (
      normalized_search = ''
      or lower(coalesce(email, '')) like '%' || normalized_search || '%'
      or lower(coalesce(username, '')) like '%' || normalized_search || '%'
      or lower(coalesce(display_name, '')) like '%' || normalized_search || '%'
    )
      and (normalized_role = 'all' or account_role = normalized_role)
  ),
  fully_filtered as (
    select *
    from filtered
    where (normalized_tier = 'all' or effective_tier = normalized_tier)
      and (
        normalized_status = 'all'
        or effective_status = normalized_status
        or (
          normalized_status = 'paid'
          and has_stripe_premium
        )
      )
  )
  select count(*)
    into total_count
    from fully_filtered;

  with users_base as (
    select
      au.id,
      au.email,
      au.created_at,
      au.last_sign_in_at,
      au.banned_until,
      p.username,
      p.display_name,
      p.avatar_url,
      coalesce(am.role, 'user') as account_role,
      us.subscription_tier,
      us.subscription_status,
      us.current_period_end,
      (
        lower(coalesce(us.subscription_tier, 'free')) = 'premium'
        and lower(coalesce(us.subscription_status, '')) in ('trialing', 'active', 'past_due')
      ) as has_stripe_premium,
      (
        aue.user_id is not null
        and aue.revoked_at is null
        and (aue.expires_at is null or aue.expires_at > now())
      ) as has_complimentary_premium,
      aue.expires_at as complimentary_expires_at
    from auth.users au
    left join public.profiles p on p.id = au.id
    left join public.admin_memberships am on am.user_id = au.id
    left join public.user_subscriptions us on us.user_id = au.id
    left join public.admin_user_entitlements aue on aue.user_id = au.id
  ),
  filtered as (
    select *,
      case
        when has_stripe_premium or has_complimentary_premium then 'premium'
        else 'free'
      end as effective_tier,
      case
        when banned_until is not null and banned_until > now() then 'suspended'
        when has_complimentary_premium and not has_stripe_premium then 'complimentary'
        when has_stripe_premium then lower(coalesce(subscription_status, 'active'))
        else 'free'
      end as effective_status
    from users_base
    where (
      normalized_search = ''
      or lower(coalesce(email, '')) like '%' || normalized_search || '%'
      or lower(coalesce(username, '')) like '%' || normalized_search || '%'
      or lower(coalesce(display_name, '')) like '%' || normalized_search || '%'
    )
      and (normalized_role = 'all' or account_role = normalized_role)
  ),
  fully_filtered as (
    select *
    from filtered
    where (normalized_tier = 'all' or effective_tier = normalized_tier)
      and (
        normalized_status = 'all'
        or effective_status = normalized_status
        or (
          normalized_status = 'paid'
          and has_stripe_premium
        )
      )
    order by created_at desc, id
    limit safe_size
    offset safe_offset
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'email', email,
        'username', username,
        'display_name', display_name,
        'avatar_url', avatar_url,
        'role', account_role,
        'tier', effective_tier,
        'status', effective_status,
        'subscription_status', subscription_status,
        'has_stripe_premium', has_stripe_premium,
        'has_complimentary_premium', has_complimentary_premium,
        'complimentary_expires_at', complimentary_expires_at,
        'current_period_end', current_period_end,
        'created_at', created_at,
        'last_sign_in_at', last_sign_in_at,
        'banned_until', banned_until
      )
      order by created_at desc, id
    ),
    '[]'::jsonb
  )
    into rows_json
    from fully_filtered;

  return jsonb_build_object(
    'users', rows_json,
    'total', total_count,
    'limit', safe_size,
    'offset', safe_offset
  );
end;
$$;

revoke all on function public.get_admin_users(text, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_admin_users(text, text, text, text, integer, integer)
  to service_role;

create or replace function public.get_admin_user_detail(target_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  account_json jsonb;
  lesson_sets_json jsonb := '[]'::jsonb;
  worksheets_json jsonb := '[]'::jsonb;
  creator_images_json jsonb := '[]'::jsonb;
  lesson_sets_count bigint := 0;
  public_sets_count bigint := 0;
  worksheets_count bigint := 0;
  creator_images_count bigint := 0;
begin
  select jsonb_build_object(
    'id', au.id,
    'email', au.email,
    'created_at', au.created_at,
    'last_sign_in_at', au.last_sign_in_at,
    'banned_until', au.banned_until,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'country_region', p.country_region,
    'role', coalesce(am.role, 'user'),
    'subscription', case
      when us.user_id is null then null
      else jsonb_build_object(
        'tier', us.subscription_tier,
        'status', us.subscription_status,
        'stripe_customer_id', us.stripe_customer_id,
        'stripe_subscription_id', us.stripe_subscription_id,
        'price_id', us.price_id,
        'current_period_end', us.current_period_end,
        'cancel_at_period_end', us.cancel_at_period_end
      )
    end,
    'complimentary_access', case
      when aue.user_id is null then null
      else jsonb_build_object(
        'active', (
          aue.revoked_at is null
          and (aue.expires_at is null or aue.expires_at > now())
        ),
        'reason', aue.reason,
        'granted_at', aue.granted_at,
        'expires_at', aue.expires_at,
        'revoked_at', aue.revoked_at
      )
    end,
    'effective_premium', public.has_premium_access(au.id)
  )
    into account_json
    from auth.users au
    left join public.profiles p on p.id = au.id
    left join public.admin_memberships am on am.user_id = au.id
    left join public.user_subscriptions us on us.user_id = au.id
    left join public.admin_user_entitlements aue on aue.user_id = au.id
   where au.id = target_user_id;

  if account_json is null then
    raise exception 'User not found';
  end if;

  select count(*),
         count(*) filter (where is_public = true)
    into lesson_sets_count, public_sets_count
    from public.lesson_sets
   where user_id = target_user_id;

  select coalesce(jsonb_agg(to_jsonb(recent)), '[]'::jsonb)
    into lesson_sets_json
    from (
      select id::text as id,
             name,
             is_public,
             created_at
        from public.lesson_sets
       where user_id = target_user_id
       order by created_at desc
       limit 10
    ) recent;

  select count(*)
    into worksheets_count
    from public.worksheets
   where user_id = target_user_id;

  select coalesce(jsonb_agg(to_jsonb(recent)), '[]'::jsonb)
    into worksheets_json
    from (
      select id::text as id,
             name,
             worksheet_type,
             is_public,
             created_at
        from public.worksheets
       where user_id = target_user_id
       order by created_at desc
       limit 10
    ) recent;

  if to_regclass('public.creator_images') is not null then
    execute
      'select count(*)
         from public.creator_images
        where user_id = $1
          and deleted_at is null'
      into creator_images_count
      using target_user_id;

    execute
      'select coalesce(jsonb_agg(to_jsonb(recent)), ''[]''::jsonb)
         from (
           select id::text as id,
                  original_filename,
                  status,
                  size_bytes,
                  created_at
             from public.creator_images
            where user_id = $1
              and deleted_at is null
            order by created_at desc
            limit 10
         ) recent'
      into creator_images_json
      using target_user_id;
  end if;

  return account_json || jsonb_build_object(
    'counts', jsonb_build_object(
      'lesson_sets', lesson_sets_count,
      'public_sets', public_sets_count,
      'worksheets', worksheets_count,
      'creator_images', creator_images_count
    ),
    'lesson_sets', lesson_sets_json,
    'worksheets', worksheets_json,
    'creator_images', creator_images_json
  );
end;
$$;

revoke all on function public.get_admin_user_detail(uuid)
  from public, anon, authenticated;
grant execute on function public.get_admin_user_detail(uuid)
  to service_role;

create or replace function public.admin_set_user_premium_grant(
  target_user_id uuid,
  actor_user_id uuid,
  grant_enabled boolean,
  grant_reason text,
  grant_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_state jsonb;
  after_state jsonb;
begin
  if not exists (
    select 1
      from public.admin_memberships
     where user_id = actor_user_id
       and role = 'owner'
  ) then
    raise exception 'Only an owner may manage complimentary premium access';
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Target user not found';
  end if;

  if char_length(btrim(coalesce(grant_reason, ''))) < 5 then
    raise exception 'A reason of at least 5 characters is required';
  end if;

  if grant_enabled and grant_expires_at is not null and grant_expires_at <= now() then
    raise exception 'Grant expiry must be in the future';
  end if;

  select to_jsonb(aue)
    into before_state
    from public.admin_user_entitlements aue
   where user_id = target_user_id;

  if grant_enabled then
    insert into public.admin_user_entitlements (
      user_id,
      entitlement,
      reason,
      expires_at,
      granted_at,
      granted_by,
      revoked_at,
      revoked_by,
      updated_at
    )
    values (
      target_user_id,
      'premium',
      btrim(grant_reason),
      grant_expires_at,
      now(),
      actor_user_id,
      null,
      null,
      now()
    )
    on conflict (user_id) do update
      set entitlement = 'premium',
          reason = excluded.reason,
          expires_at = excluded.expires_at,
          granted_at = now(),
          granted_by = actor_user_id,
          revoked_at = null,
          revoked_by = null,
          updated_at = now();
  else
    update public.admin_user_entitlements
       set revoked_at = now(),
           revoked_by = actor_user_id,
           reason = btrim(grant_reason),
           updated_at = now()
     where user_id = target_user_id
       and revoked_at is null;

    if not found then
      raise exception 'No active complimentary premium grant exists';
    end if;
  end if;

  select to_jsonb(aue)
    into after_state
    from public.admin_user_entitlements aue
   where user_id = target_user_id;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    before_state,
    after_state,
    metadata
  )
  values (
    actor_user_id,
    case
      when grant_enabled then 'admin.user_complimentary_premium_granted'
      else 'admin.user_complimentary_premium_revoked'
    end,
    'auth_user',
    target_user_id::text,
    before_state,
    after_state,
    jsonb_build_object('reason', btrim(grant_reason))
  );

  return after_state;
end;
$$;

revoke all on function public.admin_set_user_premium_grant(uuid, uuid, boolean, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_set_user_premium_grant(uuid, uuid, boolean, text, timestamptz)
  to service_role;
