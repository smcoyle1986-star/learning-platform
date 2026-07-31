-- Real-data snapshot for the Classendo administrator dashboard.
-- This function is intentionally service-role only. The application verifies
-- the administrator session before calling it from trusted server code.

create or replace function public.get_admin_dashboard_snapshot(
  monthly_price_ids text[] default array[]::text[],
  yearly_price_ids text[] default array[]::text[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  total_users bigint := 0;
  premium_users bigint := 0;
  new_users_30d bigint := 0;
  active_premium bigint := 0;
  monthly_subscribers bigint := 0;
  yearly_subscribers bigint := 0;
  unclassified_subscribers bigint := 0;
  unclassified_prices jsonb := '[]'::jsonb;
  lesson_sets_count bigint := 0;
  cards_count bigint := 0;
  public_sets_count bigint := 0;
  creator_images_count bigint;
  creator_uploaders_count bigint;
  feedback_pending_count bigint;
  reports_pending_count bigint;
  feedback_configured boolean := false;
  reports_configured boolean := false;
  registrations jsonb := '[]'::jsonb;
  subscriptions jsonb := '[]'::jsonb;
  public_content jsonb := '[]'::jsonb;
  admin_activity jsonb := '[]'::jsonb;
  feedback_table regclass;
  reports_table regclass;
  table_has_status boolean := false;
begin
  select count(*),
         count(*) filter (where created_at >= now() - interval '30 days')
    into total_users, new_users_30d
    from auth.users;

  if to_regclass('public.admin_user_entitlements') is not null then
    execute
      'select count(*)
         from auth.users au
        where exists (
          select 1
            from public.user_subscriptions us
           where us.user_id = au.id
             and lower(coalesce(us.subscription_tier, ''free'')) = ''premium''
             and lower(coalesce(us.subscription_status, '''')) in (''active'', ''trialing'', ''past_due'')
        )
        or exists (
          select 1
            from public.admin_user_entitlements aue
           where aue.user_id = au.id
             and aue.entitlement = ''premium''
             and aue.revoked_at is null
             and (aue.expires_at is null or aue.expires_at > now())
        )'
      into premium_users;
  else
    select count(*)
      into premium_users
      from public.user_subscriptions
     where lower(coalesce(subscription_tier, 'free')) = 'premium'
       and lower(coalesce(subscription_status, '')) in ('active', 'trialing', 'past_due');
  end if;

  select
    count(*) filter (
      where lower(coalesce(subscription_tier, 'free')) = 'premium'
        and lower(coalesce(subscription_status, '')) in ('active', 'trialing')
    ),
    count(*) filter (
      where lower(coalesce(subscription_tier, 'free')) = 'premium'
        and lower(coalesce(subscription_status, '')) in ('active', 'trialing')
        and price_id = any(monthly_price_ids)
    ),
    count(*) filter (
      where lower(coalesce(subscription_tier, 'free')) = 'premium'
        and lower(coalesce(subscription_status, '')) in ('active', 'trialing')
        and price_id = any(yearly_price_ids)
    ),
    count(*) filter (
      where lower(coalesce(subscription_tier, 'free')) = 'premium'
        and lower(coalesce(subscription_status, '')) in ('active', 'trialing')
        and (
          price_id is null
          or not (
            price_id = any(monthly_price_ids)
            or price_id = any(yearly_price_ids)
          )
        )
    )
    into
      active_premium,
      monthly_subscribers,
      yearly_subscribers,
      unclassified_subscribers
    from public.user_subscriptions;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'price_id', unmatched.price_id,
        'subscribers', unmatched.subscribers
      )
    ),
    '[]'::jsonb
  )
    into unclassified_prices
    from (
      select price_id,
             count(*) as subscribers
        from public.user_subscriptions
       where lower(coalesce(subscription_tier, 'free')) = 'premium'
         and lower(coalesce(subscription_status, '')) in ('active', 'trialing')
         and (
           price_id is null
           or not (
             price_id = any(monthly_price_ids)
             or price_id = any(yearly_price_ids)
           )
         )
       group by price_id
    ) unmatched;

  select count(*),
         count(*) filter (where is_public = true)
    into lesson_sets_count, public_sets_count
    from public.lesson_sets;

  select count(*)
    into cards_count
    from public.cards;

  if to_regclass('public.creator_images') is not null then
    execute
      'select count(*), count(distinct user_id)
         from public.creator_images
        where deleted_at is null
          and status = $1'
      into creator_images_count, creator_uploaders_count
      using 'ready';
  end if;

  feedback_table := coalesce(
    to_regclass('public.user_feedback'),
    to_regclass('public.feedback')
  );
  feedback_configured := feedback_table is not null;

  if feedback_configured then
    select exists (
      select 1
        from pg_catalog.pg_attribute
       where attrelid = feedback_table
         and attname = 'status'
         and not attisdropped
    ) into table_has_status;

    if table_has_status then
      execute format(
        'select count(*) from %s where lower(coalesce(status, %L)) = %L',
        feedback_table,
        'pending',
        'pending'
      ) into feedback_pending_count;
    else
      execute format('select count(*) from %s', feedback_table)
        into feedback_pending_count;
    end if;
  end if;

  reports_table := coalesce(
    to_regclass('public.community_reports'),
    to_regclass('public.reports')
  );
  reports_configured := reports_table is not null;

  if reports_configured then
    select exists (
      select 1
        from pg_catalog.pg_attribute
       where attrelid = reports_table
         and attname = 'status'
         and not attisdropped
    ) into table_has_status;

    if table_has_status then
      execute format(
        'select count(*) from %s where lower(coalesce(status, %L)) = %L',
        reports_table,
        'pending',
        'pending'
      ) into reports_pending_count;
    else
      execute format('select count(*) from %s', reports_table)
        into reports_pending_count;
    end if;
  end if;

  select coalesce(jsonb_agg(to_jsonb(recent)), '[]'::jsonb)
    into registrations
    from (
      select id::text as id,
             email,
             created_at
        from auth.users
       order by created_at desc
       limit 6
    ) recent;

  select coalesce(jsonb_agg(to_jsonb(recent)), '[]'::jsonb)
    into subscriptions
    from (
      select us.user_id::text as id,
             au.email,
             us.subscription_tier as tier,
             us.subscription_status as status,
             us.updated_at as occurred_at
        from public.user_subscriptions us
        left join auth.users au on au.id = us.user_id
       where us.stripe_subscription_id is not null
          or lower(coalesce(us.subscription_tier, 'free')) = 'premium'
       order by us.updated_at desc
       limit 6
    ) recent;

  select coalesce(jsonb_agg(to_jsonb(recent)), '[]'::jsonb)
    into public_content
    from (
      select id::text as id,
             name,
             created_at
        from public.lesson_sets
       where is_public = true
       order by created_at desc
       limit 6
    ) recent;

  select coalesce(jsonb_agg(to_jsonb(recent)), '[]'::jsonb)
    into admin_activity
    from (
      select id::text as id,
             action,
             target_type,
             target_id,
             created_at
        from public.admin_audit_logs
       order by created_at desc
       limit 6
    ) recent;

  return jsonb_build_object(
    'generated_at', now(),
    'users', jsonb_build_object(
      'total', total_users,
      'free', greatest(total_users - premium_users, 0),
      'premium', premium_users,
      'new_30d', new_users_30d
    ),
    'subscriptions', jsonb_build_object(
      'active_premium', active_premium,
      'monthly', monthly_subscribers,
      'yearly', yearly_subscribers,
      'unclassified', unclassified_subscribers,
      'unclassified_prices', unclassified_prices
    ),
    'content', jsonb_build_object(
      'lesson_sets', lesson_sets_count,
      'cards', cards_count,
      'public_sets', public_sets_count,
      'creator_images', creator_images_count,
      'creator_uploaders', creator_uploaders_count
    ),
    'platform', jsonb_build_object(
      'feedback_configured', feedback_configured,
      'feedback_pending', feedback_pending_count,
      'reports_configured', reports_configured,
      'reports_pending', reports_pending_count
    ),
    'recent', jsonb_build_object(
      'registrations', registrations,
      'subscriptions', subscriptions,
      'public_content', public_content,
      'admin_activity', admin_activity
    )
  );
end;
$$;

comment on function public.get_admin_dashboard_snapshot(text[], text[]) is
  'Returns the service-role-only aggregate snapshot used by the Classendo administrator dashboard.';

revoke all on function public.get_admin_dashboard_snapshot(text[], text[])
  from public, anon, authenticated;
grant execute on function public.get_admin_dashboard_snapshot(text[], text[]) to service_role;

-- Defense in depth for the Phase 2 bootstrap function. Supabase projects can
-- have explicit default EXECUTE grants for API roles in addition to PUBLIC.
revoke all on function public.bootstrap_first_admin_owner(uuid)
  from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin_owner(uuid) to service_role;
