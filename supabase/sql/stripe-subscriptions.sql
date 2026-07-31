create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  subscription_tier text not null default 'free',
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  billing_interval text check (billing_interval is null or billing_interval in ('month', 'year')),
  stripe_livemode boolean,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_subscriptions_customer_idx
  on public.user_subscriptions (stripe_customer_id);

create index if not exists user_subscriptions_subscription_idx
  on public.user_subscriptions (stripe_subscription_id);

alter table public.user_subscriptions enable row level security;

drop policy if exists "user_subscriptions_select_own" on public.user_subscriptions;
create policy "user_subscriptions_select_own"
  on public.user_subscriptions
  for select
  using (auth.uid() = user_id);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create or replace function public.has_premium_access(target_user_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_subscriptions us
    where us.user_id = target_user_id
      and lower(coalesce(us.subscription_tier, 'free')) = 'premium'
      and lower(coalesce(us.subscription_status, '')) in ('trialing', 'active', 'past_due')
  );
$$;

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

  select count(*)
  from public.lesson_sets ls
  where ls.user_id = new.user_id
    and ls.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  into lesson_count;

  if lesson_count >= 6 then
    raise exception 'Free accounts can save up to 6 lesson sets. Upgrade to Premium for unlimited saves.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_free_worksheet_save_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  worksheet_count integer;
begin
  if public.has_premium_access(new.user_id) then
    return new;
  end if;

  select count(*)
  from public.worksheets ws
  where ws.user_id = new.user_id
    and ws.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  into worksheet_count;

  if worksheet_count >= 6 then
    raise exception 'Free accounts can save up to 6 worksheets. Upgrade to Premium for unlimited saves.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_free_dashboard_save_limit_on_lesson_sets on public.lesson_sets;
drop trigger if exists enforce_free_lesson_set_save_limit_on_lesson_sets on public.lesson_sets;
create trigger enforce_free_lesson_set_save_limit_on_lesson_sets
  before insert on public.lesson_sets
  for each row execute function public.enforce_free_lesson_set_save_limit();

drop trigger if exists enforce_free_dashboard_save_limit_on_worksheets on public.worksheets;
drop trigger if exists enforce_free_worksheet_save_limit_on_worksheets on public.worksheets;
create trigger enforce_free_worksheet_save_limit_on_worksheets
  before insert on public.worksheets
  for each row execute function public.enforce_free_worksheet_save_limit();
