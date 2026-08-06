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

revoke all on function public.copy_lesson_set_once(uuid) from public;
grant execute on function public.copy_lesson_set_once(uuid) to authenticated, service_role;

-- Preserve compatibility for any existing client that still calls the older RPC.
create or replace function public.copy_lesson_set(original_set uuid)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select result.lesson_set_id
  from public.copy_lesson_set_once(original_set) as result
  limit 1;
$$;

revoke all on function public.copy_lesson_set(uuid) from public;
grant execute on function public.copy_lesson_set(uuid) to authenticated, service_role;
