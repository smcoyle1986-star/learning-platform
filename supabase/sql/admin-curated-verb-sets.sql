-- Keep curated Classendo verb sets in the normal lesson_sets/cards model while
-- retaining the exact source verb row used for every administrator card.

alter table public.cards
  add column if not exists verb_id uuid references public.verbs(id) on delete restrict;

create index if not exists cards_verb_id_idx
  on public.cards (verb_id)
  where verb_id is not null;

create unique index if not exists cards_lesson_set_verb_id_idx
  on public.cards (lesson_set_id, verb_id)
  where verb_id is not null;

-- Preserve the source verb relation when a teacher copies a Community set.
create or replace function public.copy_lesson_set(original_set uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_set public.lesson_sets%rowtype;
  new_set_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to copy a lesson set.';
  end if;

  select *
    into source_set
    from public.lesson_sets
   where id = original_set
     and (is_public = true or user_id = auth.uid());

  if not found then
    raise exception 'Lesson set not found or is not available to copy.';
  end if;

  insert into public.lesson_sets (
    user_id,
    name,
    last_used,
    is_public,
    copied_from,
    tags
  )
  values (
    auth.uid(),
    source_set.name,
    now(),
    false,
    source_set.id,
    coalesce(source_set.tags, array[]::text[])
  )
  returning id into new_set_id;

  insert into public.cards (
    lesson_set_id,
    verb_id,
    front,
    back,
    position,
    creator_image_id
  )
  select
    new_set_id,
    verb_id,
    front,
    back,
    position,
    creator_image_id
  from public.cards
  where lesson_set_id = source_set.id
  order by position nulls last, created_at, id;

  update public.lesson_sets
     set download_count = download_count + 1
   where id = source_set.id;

  return new_set_id;
end;
$$;

revoke all on function public.copy_lesson_set(uuid) from public;
grant execute on function public.copy_lesson_set(uuid) to authenticated, service_role;

-- Administrator-owned Community sets do not consume an ordinary account's
-- six active Basic sets. Keep the current Basic-account behavior unchanged for
-- every non-administrator.
create or replace function public.enforce_free_lesson_set_save_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  lesson_count integer;
begin
  if public.has_premium_access(new.user_id)
     or exists (
       select 1
         from public.admin_memberships as membership
        where membership.user_id = new.user_id
     ) then
    return new;
  end if;

  select count(*)
    into lesson_count
    from public.lesson_sets as lesson_set
   where lesson_set.user_id = new.user_id
     and lesson_set.basic_active
     and lesson_set.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if lesson_count >= 6 then
    raise exception 'Basic accounts can have up to 6 active lesson sets. Upgrade to Premium for unlimited sets.';
  end if;

  new.basic_active := true;
  new.basic_locked_at := null;
  return new;
end;
$$;

-- Transactionally create or synchronize one exact-title administrator set.
-- This function is intentionally service-role-only and never creates verbs.
create or replace function public.sync_classendo_admin_verb_set(
  owner_id uuid,
  set_name text,
  set_tags text[],
  source_verb_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_set_id uuid;
  expected_count integer := cardinality(source_verb_ids);
  distinct_count integer;
  resolved_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'This operation requires the service role.';
  end if;

  if not exists (
    select 1
      from public.admin_memberships
     where user_id = owner_id
       and role in ('owner', 'admin')
  ) then
    raise exception 'The requested owner is not a Classendo administrator.';
  end if;

  if btrim(coalesce(set_name, '')) = ''
     or set_name !~ ' - (Easy|Medium|Hard)$'
     or set_name ~ '\([0-9]+\)' then
    raise exception 'Invalid curated set title: %', set_name;
  end if;

  if expected_count is null or expected_count < 2 or expected_count > 50 then
    raise exception 'Curated sets require between 2 and 50 verbs.';
  end if;

  select count(distinct verb_id)
    into distinct_count
    from unnest(source_verb_ids) as requested(verb_id);

  if distinct_count <> expected_count then
    raise exception 'Duplicate verb IDs are not allowed inside a curated set.';
  end if;

  select count(*)
    into resolved_count
    from public.verbs
   where id = any(source_verb_ids)
     and image_id is not null
     and image_id like '%_1.png%';

  if resolved_count <> expected_count then
    raise exception 'Every requested verb ID must resolve to an existing verb with image_1.';
  end if;

  select id
    into target_set_id
    from public.lesson_sets
   where user_id = owner_id
     and name = set_name
   for update;

  if target_set_id is null then
    insert into public.lesson_sets (
      user_id,
      name,
      is_public,
      tags,
      last_used,
      basic_active
    )
    values (
      owner_id,
      set_name,
      true,
      coalesce(set_tags, array[]::text[]),
      now(),
      true
    )
    returning id into target_set_id;
  else
    update public.lesson_sets
       set is_public = true,
           tags = coalesce(set_tags, array[]::text[]),
           last_used = now(),
           hidden_at = null,
           hidden_by = null,
           deleted_at = null,
           deleted_by = null,
           moderation_note = null,
           basic_active = true,
           basic_locked_at = null
     where id = target_set_id;
  end if;

  delete from public.cards where lesson_set_id = target_set_id;

  insert into public.cards (
    lesson_set_id,
    verb_id,
    front,
    back,
    position
  )
  select
    target_set_id,
    verb.id,
    verb.lemma,
    verb.image_id,
    (requested.ordinality - 1)::integer
  from unnest(source_verb_ids) with ordinality as requested(verb_id, ordinality)
  join public.verbs as verb on verb.id = requested.verb_id
  order by requested.ordinality;

  return target_set_id;
end;
$$;

revoke all on function public.sync_classendo_admin_verb_set(uuid, text, text[], uuid[]) from public, anon, authenticated;
grant execute on function public.sync_classendo_admin_verb_set(uuid, text, text[], uuid[]) to service_role;
