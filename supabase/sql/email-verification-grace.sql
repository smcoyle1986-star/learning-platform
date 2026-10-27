-- Apply this schema before deploying the 21-day verification policy.
-- Activation is deliberately separate. After the app is deployed and the schema
-- is confirmed, run the final UPDATE below once in production.
create table if not exists public.classendo_verification_policy (
  id boolean primary key default true check (id),
  activated_at timestamptz,
  created_at timestamptz not null default now()
);
insert into public.classendo_verification_policy (id) values (true)
on conflict (id) do nothing;
alter table public.classendo_verification_policy enable row level security;
revoke all on public.classendo_verification_policy from anon, authenticated;
grant select on public.classendo_verification_policy to service_role;

-- Only the service role can inspect another account. The matched current Auth
-- email prevents an old verification from surviving an email change.
create or replace function public.get_classendo_verification_grace(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'verified', coalesce(v.verified_at is not null and v.normalized_email = lower(trim(coalesce(u.email, ''))), false),
    'email', u.email,
    'verifiedAt', case when v.normalized_email = lower(trim(coalesce(u.email, ''))) then v.verified_at end,
    'deadline', case when p.activated_at is null or v.verified_at is not null and v.normalized_email = lower(trim(coalesce(u.email, ''))) then null
      else greatest(u.created_at, p.activated_at) + interval '21 days' end,
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

-- Run only at production activation, after this migration and the app release:
-- update public.classendo_verification_policy
--    set activated_at = clock_timestamp()
--  where id = true and activated_at is null;
-- The WHERE clause makes retries safe and preserves the original timestamp.

-- Direct Supabase browser calls must obey the same deadline as Next routes.
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
      and (
        p.activated_at is null
        or (v.verified_at is not null and v.normalized_email = lower(trim(coalesce(u.email, ''))))
        or now() < greatest(u.created_at, p.activated_at) + interval '21 days'
      )
  );
$$;
revoke all on function public.classendo_account_within_verification_grace(uuid) from public, anon;
grant execute on function public.classendo_account_within_verification_grace(uuid) to authenticated, service_role;

-- Restrictive policies combine with existing ownership/visibility policies.
-- Only account-owned data is listed; public reference data remains available.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'lesson_sets', 'cards', 'worksheets', 'game_prompt_sets',
    'creator_images', 'creator_flashcards', 'user_subscriptions',
    'user_feedback', 'community_reports'
  ] loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = table_name and c.relrowsecurity)
      and not exists (select 1 from pg_policies where schemaname = 'public'
        and tablename = table_name and policyname = 'verification_grace_account_access') then
      execute format('create policy verification_grace_account_access on public.%I as restrictive for all to authenticated using (public.classendo_account_within_verification_grace(auth.uid())) with check (public.classendo_account_within_verification_grace(auth.uid()))', table_name);
    end if;
  end loop;
end;
$$;

-- Creator object access is account-specific; public storage objects remain public.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'verification_grace_creator_storage') then
    create policy verification_grace_creator_storage on storage.objects as restrictive
      for all to authenticated
      using (bucket_id <> 'creator-images' or public.classendo_account_within_verification_grace(auth.uid()))
      with check (bucket_id <> 'creator-images' or public.classendo_account_within_verification_grace(auth.uid()));
  end if;
end;
$$;

-- This security-definer copy RPC bypasses RLS, so gate it explicitly.
-- Make Community-to-Dashboard copies idempotent without deleting any existing
-- duplicate sets. Calls for owned or previously copied sets return the existing
-- lesson-set ID; concurrent copy attempts are serialized per user/source pair.

create or replace function public.copy_lesson_set_once(original_set uuid)
returns table (lesson_set_id uuid, outcome text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_set public.lesson_sets%rowtype;
  canonical_source_id uuid;
  existing_set_id uuid;
  new_set_id uuid;
  current_user_id uuid := auth.uid();
  copy_name text;
  copy_suffix integer := 2;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to copy a lesson set.';
  end if;
  if not public.classendo_account_within_verification_grace(current_user_id) then
    raise exception 'Verify your email to continue.';
  end if;

  select * into source_set
    from public.lesson_sets
   where id = original_set
     and (is_public = true or user_id = current_user_id);
  if not found then
    raise exception 'Lesson set not found or is not available to copy.';
  end if;

  if source_set.user_id = current_user_id then
    return query select source_set.id, 'owned'::text;
    return;
  end if;

  -- Follow copied_from links so re-shared copies resolve to the same original
  -- Community resource instead of creating another dashboard copy.
  with recursive source_chain as (
    select source_set.id as id, source_set.copied_from as copied_from, 0 as depth
    union all
    select parent.id, parent.copied_from, source_chain.depth + 1
      from public.lesson_sets as parent
      join source_chain on parent.id = source_chain.copied_from
     where source_chain.depth < 20
  )
  select id
    into canonical_source_id
    from source_chain
   order by depth desc
   limit 1;

  canonical_source_id := coalesce(canonical_source_id, source_set.id);

  -- Serialize all Community copies for this user. This protects both source
  -- deduplication and per-user lesson-name selection.
  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text, 0)
  );

  select id into existing_set_id
    from public.lesson_sets
   where user_id = current_user_id
     and copied_from in (source_set.id, canonical_source_id)
   order by created_at, id
   limit 1;
  if found then
    return query select existing_set_id, 'already_saved'::text;
    return;
  end if;

  -- A genuinely different Community set may have the same title as one the
  -- teacher already saved. Keep both without violating the dashboard's
  -- per-user unique-name rule.
  copy_name := source_set.name;
  if exists (
    select 1 from public.lesson_sets
     where user_id = current_user_id
       and lower(btrim(name)) = lower(btrim(copy_name))
  ) then
    copy_name := source_set.name || ' (Community)';
    while exists (
      select 1 from public.lesson_sets
       where user_id = current_user_id
         and lower(btrim(name)) = lower(btrim(copy_name))
    ) loop
      copy_name := source_set.name || ' (Community ' || copy_suffix || ')';
      copy_suffix := copy_suffix + 1;
    end loop;
  end if;

  insert into public.lesson_sets (
    user_id, name, last_used, is_public, copied_from, tags, content_types
  )
  values (
    current_user_id, copy_name, now(), false, canonical_source_id,
    coalesce(source_set.tags, array[]::text[]),
    coalesce(source_set.content_types, array[]::text[])
  )
  returning id into new_set_id;

  insert into public.cards (
    lesson_set_id, verb_id, adjective_id, noun_id, content_type,
    front, back, position, creator_image_id
  )
  select
    new_set_id,
    source_card.verb_id,
    source_card.adjective_id,
    source_card.noun_id,
    source_card.content_type,
    source_card.front,
    source_card.back,
    source_card.position,
    source_card.creator_image_id
  from public.cards as source_card
  where source_card.lesson_set_id = source_set.id
  order by source_card.position nulls last, source_card.created_at, source_card.id;

  update public.lesson_sets
     set download_count = download_count + 1
   where id = source_set.id;

  return query select new_set_id, 'copied'::text;
end;
$$;


-- Refuse production activation if an account table can bypass the restrictive
-- policies through direct Supabase calls. Existing users remain unaffected
-- until the missing RLS prerequisite is fixed.
create or replace function public.guard_classendo_verification_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare table_name text;
begin
  if old.activated_at is not null and new.activated_at is distinct from old.activated_at then
    raise exception 'Verification activation timestamp is immutable.';
  end if;
  if old.activated_at is null and new.activated_at is not null then
    foreach table_name in array array[
      'profiles', 'lesson_sets', 'cards', 'worksheets', 'game_prompt_sets',
      'creator_images', 'creator_flashcards', 'user_subscriptions',
      'user_feedback', 'community_reports'
    ] loop
      if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
        join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
        where n.nspname = 'public' and c.relname = table_name and c.relrowsecurity
          and p.policyname = 'verification_grace_account_access') then
        raise exception 'Verification gate missing on %', table_name;
      end if;
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_classendo_verification_activation on public.classendo_verification_policy;
create trigger guard_classendo_verification_activation before update of activated_at
  on public.classendo_verification_policy for each row
  execute function public.guard_classendo_verification_activation();

create table if not exists public.classendo_verification_urgent_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_day date not null,
  shown_at timestamptz not null default now(),
  primary key (user_id, reminder_day)
);
alter table public.classendo_verification_urgent_reminders enable row level security;
revoke all on public.classendo_verification_urgent_reminders from anon, authenticated;
grant all on public.classendo_verification_urgent_reminders to service_role;

create or replace function public.claim_classendo_verification_urgent_reminder(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare current_status jsonb;
        deadline_at timestamptz;
        remaining interval;
begin
  current_status := public.get_classendo_verification_grace(p_user_id);
  if current_status is null or (current_status->>'verified')::boolean then return false; end if;
  deadline_at := (current_status->>'deadline')::timestamptz;
  if deadline_at is null then return false; end if;
  remaining := deadline_at - now();
  if remaining <= interval '0 seconds' or remaining > interval '7 days' then return false; end if;
  insert into public.classendo_verification_urgent_reminders (user_id, reminder_day)
    values (p_user_id, (now() at time zone 'UTC')::date)
    on conflict do nothing;
  return found;
end;
$$;
revoke all on function public.claim_classendo_verification_urgent_reminder(uuid) from public, anon, authenticated;
grant execute on function public.claim_classendo_verification_urgent_reminder(uuid) to service_role;

-- Keep the existing trial and conversion flow, with a current-email check.
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

  -- An older token cannot verify a different current Auth email or start a trial.
  if not exists (
    select 1 from auth.users u where u.id = token_row.user_id
      and lower(trim(coalesce(u.email, ''))) = token_row.normalized_email
  ) then
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


-- The security-definer feedback RPC also bypasses table RLS.
create or replace function public.submit_user_feedback(
  feedback_category text,
  feedback_message text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_category text := lower(btrim(coalesce(feedback_category, '')));
  normalized_message text := btrim(coalesce(feedback_message, ''));
  feedback_id uuid;
  recent_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  if not public.classendo_account_within_verification_grace(current_user_id) then
    raise exception 'Verify your email to continue.' using errcode = '42501';
  end if;

  if normalized_category not in (
    'bug',
    'feature',
    'content',
    'billing',
    'account',
    'other'
  ) then
    raise exception 'Select a valid feedback category.'
      using errcode = '22023';
  end if;

  if char_length(normalized_message) < 10
     or char_length(normalized_message) > 4000 then
    raise exception 'Feedback must be between 10 and 4000 characters.'
      using errcode = '22023';
  end if;

  select count(*)
    into recent_count
    from public.user_feedback
   where user_id = current_user_id
     and created_at >= now() - interval '1 hour';

  if recent_count >= 5 then
    raise exception 'Feedback submission limit reached. Please try again later.'
      using errcode = 'P0001';
  end if;

  insert into public.user_feedback (
    user_id,
    category,
    message
  )
  values (
    current_user_id,
    normalized_category,
    normalized_message
  )
  returning id into feedback_id;

  return feedback_id;
end;
$$;
