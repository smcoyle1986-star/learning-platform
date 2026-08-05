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
  existing_set_id uuid;
  new_set_id uuid;
  current_user_id uuid := auth.uid();
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

  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text || ':' || original_set::text, 0)
  );

  select id into existing_set_id
    from public.lesson_sets
   where user_id = current_user_id
     and copied_from = original_set
   order by created_at, id
   limit 1;
  if found then
    return query select existing_set_id, 'already_saved'::text;
    return;
  end if;

  insert into public.lesson_sets (
    user_id, name, last_used, is_public, copied_from, tags, content_types
  )
  values (
    current_user_id, source_set.name, now(), false, source_set.id,
    coalesce(source_set.tags, array[]::text[]),
    coalesce(source_set.content_types, array[]::text[])
  )
  returning id into new_set_id;

  insert into public.cards (
    lesson_set_id, verb_id, adjective_id, noun_id, content_type,
    front, back, position, creator_image_id
  )
  select
    new_set_id, verb_id, adjective_id, noun_id, content_type,
    front, back, position, creator_image_id
  from public.cards
  where lesson_set_id = source_set.id
  order by position nulls last, created_at, id;

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
