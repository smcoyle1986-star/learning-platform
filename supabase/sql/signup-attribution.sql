-- First-touch signup attribution for the Classendo admin analytics dashboard.
-- Store only UTM labels, a referrer hostname (never a full URL), and landing path.

create table if not exists public.signup_attributions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer_host text,
  landing_path text,
  created_at timestamptz not null default now(),
  constraint signup_attributions_utm_source_length check (utm_source is null or char_length(utm_source) <= 80),
  constraint signup_attributions_utm_medium_length check (utm_medium is null or char_length(utm_medium) <= 80),
  constraint signup_attributions_utm_campaign_length check (utm_campaign is null or char_length(utm_campaign) <= 80),
  constraint signup_attributions_utm_content_length check (utm_content is null or char_length(utm_content) <= 80),
  constraint signup_attributions_utm_term_length check (utm_term is null or char_length(utm_term) <= 80),
  constraint signup_attributions_referrer_host_length check (referrer_host is null or char_length(referrer_host) <= 80),
  constraint signup_attributions_landing_path_length check (landing_path is null or char_length(landing_path) <= 80)
);

create index if not exists signup_attributions_created_at_idx
  on public.signup_attributions (created_at desc);

alter table public.signup_attributions enable row level security;
revoke all on table public.signup_attributions from public, anon, authenticated;
grant select, insert, update, delete on table public.signup_attributions to service_role;

create or replace function public.capture_new_user_signup_attribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  attribution jsonb := coalesce(new.raw_user_meta_data -> 'signup_attribution', '{}'::jsonb);
begin
  if jsonb_typeof(attribution) <> 'object' then
    return new;
  end if;

  insert into public.signup_attributions (
    user_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    referrer_host, landing_path
  ) values (
    new.id,
    nullif(left(trim(coalesce(attribution ->> 'utmSource', '')), 80), ''),
    nullif(left(trim(coalesce(attribution ->> 'utmMedium', '')), 80), ''),
    nullif(left(trim(coalesce(attribution ->> 'utmCampaign', '')), 80), ''),
    nullif(left(trim(coalesce(attribution ->> 'utmContent', '')), 80), ''),
    nullif(left(trim(coalesce(attribution ->> 'utmTerm', '')), 80), ''),
    nullif(left(trim(coalesce(attribution ->> 'referrerHost', '')), 80), ''),
    nullif(left(trim(coalesce(attribution ->> 'landingPath', '')), 80), '')
  ) on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_signup_attribution on auth.users;
create trigger on_auth_user_created_signup_attribution
  after insert on auth.users
  for each row execute function public.capture_new_user_signup_attribution();
