-- Stripe/Supabase subscription observability for Classendo administrators.
-- Paid billing remains Stripe-authoritative; this migration adds synchronized
-- metadata and a read-only, service-role-only directory.

alter table public.user_subscriptions
  add column if not exists billing_interval text,
  add column if not exists stripe_livemode boolean,
  add column if not exists last_synced_at timestamptz;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.user_subscriptions'::regclass
       and conname = 'user_subscriptions_billing_interval_check'
  ) then
    alter table public.user_subscriptions
      add constraint user_subscriptions_billing_interval_check
      check (billing_interval is null or billing_interval in ('month', 'year'));
  end if;
end;
$$;

create index if not exists user_subscriptions_status_interval_idx
  on public.user_subscriptions (subscription_status, billing_interval);

create index if not exists user_subscriptions_last_synced_idx
  on public.user_subscriptions (last_synced_at desc);

create or replace function public.get_admin_subscriptions(
  search_query text default '',
  status_filter text default 'all',
  interval_filter text default 'all',
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
  normalized_status text := lower(coalesce(status_filter, 'all'));
  normalized_interval text := lower(coalesce(interval_filter, 'all'));
  total_count bigint := 0;
  active_count bigint := 0;
  trialing_count bigint := 0;
  past_due_count bigint := 0;
  canceling_count bigint := 0;
  rows_json jsonb := '[]'::jsonb;
begin
  with base as (
    select
      us.user_id,
      au.email,
      p.username,
      p.display_name,
      us.stripe_customer_id,
      us.stripe_subscription_id,
      us.subscription_status,
      us.subscription_tier,
      us.price_id,
      us.billing_interval,
      us.current_period_end,
      us.cancel_at_period_end,
      us.stripe_livemode,
      us.last_synced_at,
      us.created_at,
      us.updated_at,
      case
        when us.stripe_subscription_id is null then 'no_subscription'
        else lower(coalesce(us.subscription_status, 'unknown'))
      end as effective_status
    from public.user_subscriptions us
    join auth.users au on au.id = us.user_id
    left join public.profiles p on p.id = us.user_id
  ),
  filtered as (
    select *
      from base
     where (
       normalized_search = ''
       or lower(coalesce(email, '')) like '%' || normalized_search || '%'
       or lower(coalesce(username, '')) like '%' || normalized_search || '%'
       or lower(coalesce(display_name, '')) like '%' || normalized_search || '%'
       or lower(coalesce(stripe_customer_id, '')) like '%' || normalized_search || '%'
       or lower(coalesce(stripe_subscription_id, '')) like '%' || normalized_search || '%'
     )
       and (normalized_status = 'all' or effective_status = normalized_status)
       and (
         normalized_interval = 'all'
         or (
           normalized_interval = 'unclassified'
           and billing_interval is null
         )
         or billing_interval = normalized_interval
       )
  )
  select
    count(*),
    count(*) filter (where effective_status = 'active'),
    count(*) filter (where effective_status = 'trialing'),
    count(*) filter (where effective_status = 'past_due'),
    count(*) filter (
      where cancel_at_period_end = true
        and effective_status in ('active', 'trialing', 'past_due')
    )
    into
      total_count,
      active_count,
      trialing_count,
      past_due_count,
      canceling_count
    from filtered;

  with base as (
    select
      us.user_id,
      au.email,
      p.username,
      p.display_name,
      us.stripe_customer_id,
      us.stripe_subscription_id,
      us.subscription_status,
      us.subscription_tier,
      us.price_id,
      us.billing_interval,
      us.current_period_end,
      us.cancel_at_period_end,
      us.stripe_livemode,
      us.last_synced_at,
      us.created_at,
      us.updated_at,
      case
        when us.stripe_subscription_id is null then 'no_subscription'
        else lower(coalesce(us.subscription_status, 'unknown'))
      end as effective_status
    from public.user_subscriptions us
    join auth.users au on au.id = us.user_id
    left join public.profiles p on p.id = us.user_id
  ),
  filtered as (
    select *
      from base
     where (
       normalized_search = ''
       or lower(coalesce(email, '')) like '%' || normalized_search || '%'
       or lower(coalesce(username, '')) like '%' || normalized_search || '%'
       or lower(coalesce(display_name, '')) like '%' || normalized_search || '%'
       or lower(coalesce(stripe_customer_id, '')) like '%' || normalized_search || '%'
       or lower(coalesce(stripe_subscription_id, '')) like '%' || normalized_search || '%'
     )
       and (normalized_status = 'all' or effective_status = normalized_status)
       and (
         normalized_interval = 'all'
         or (
           normalized_interval = 'unclassified'
           and billing_interval is null
         )
         or billing_interval = normalized_interval
       )
     order by updated_at desc, user_id
     limit safe_size
     offset safe_offset
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'email', email,
        'username', username,
        'display_name', display_name,
        'stripe_customer_id', stripe_customer_id,
        'stripe_subscription_id', stripe_subscription_id,
        'status', effective_status,
        'subscription_tier', subscription_tier,
        'price_id', price_id,
        'billing_interval', billing_interval,
        'current_period_end', current_period_end,
        'cancel_at_period_end', cancel_at_period_end,
        'stripe_livemode', stripe_livemode,
        'last_synced_at', last_synced_at,
        'created_at', created_at,
        'updated_at', updated_at
      )
      order by updated_at desc, user_id
    ),
    '[]'::jsonb
  )
    into rows_json
    from filtered;

  return jsonb_build_object(
    'subscriptions', rows_json,
    'total', total_count,
    'limit', safe_size,
    'offset', safe_offset,
    'summary', jsonb_build_object(
      'active', active_count,
      'trialing', trialing_count,
      'past_due', past_due_count,
      'canceling', canceling_count
    )
  );
end;
$$;

revoke all on function public.get_admin_subscriptions(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_admin_subscriptions(text, text, text, integer, integer)
  to service_role;
