-- Required Creator card classification and mixed-content Community filtering.

-- The only existing legacy Creator card at migration time is the noun "boy".
update public.creator_flashcards
   set card_type = 'noun'
 where card_type = 'custom'
   and lower(btrim(front)) = 'boy';

do $$
begin
  if exists (
    select 1 from public.creator_flashcards
     where card_type not in ('noun', 'verb', 'adjective', 'preposition', 'phonics')
  ) then
    raise exception 'Classify every legacy Creator card before applying content-type constraints.';
  end if;
end;
$$;

alter table public.creator_flashcards
  alter column card_type drop default;

alter table public.creator_flashcards
  drop constraint if exists creator_flashcards_card_type_check;
alter table public.creator_flashcards
  add constraint creator_flashcards_card_type_check
  check (card_type in ('noun', 'verb', 'adjective', 'preposition', 'phonics'));

alter table public.cards
  add column if not exists content_type text;

alter table public.cards
  drop constraint if exists cards_content_type_check;
alter table public.cards
  add constraint cards_content_type_check
  check (
    content_type is null
    or content_type in ('noun', 'verb', 'adjective', 'preposition', 'phonics')
  );

alter table public.lesson_sets
  add column if not exists content_types text[] not null default array[]::text[];

alter table public.lesson_sets
  drop constraint if exists lesson_sets_content_types_check;
alter table public.lesson_sets
  add constraint lesson_sets_content_types_check
  check (
    content_types <@ array['noun', 'verb', 'adjective', 'preposition', 'phonics']::text[]
  );

create index if not exists lesson_sets_content_types_gin_idx
  on public.lesson_sets using gin (content_types);

-- Backfill exact linked vocabulary cards and recognizable library image paths.
update public.cards
   set content_type = case
     when noun_id is not null then 'noun'
     when verb_id is not null then 'verb'
     when adjective_id is not null then 'adjective'
     when back like '%/vocab-images/nouns/%' then 'noun'
     when back like '%/vocab-images/verbs/%' then 'verb'
     when back like '%/vocab-images/adjectives/%' then 'adjective'
     when back like '%/vocab-images/prepositions/%' then 'preposition'
     when back like '%/vocab-images/phonics/%' then 'phonics'
     else content_type
   end
 where content_type is null;

-- Match legacy saved Creator cards only when image and card text identify one
-- classified Creator card unambiguously.
update public.cards as card
   set content_type = (
     select min(creator.card_type)
       from public.creator_flashcards as creator
      where creator.creator_image_id = card.creator_image_id
        and creator.front = card.front
   )
 where card.content_type is null
   and card.creator_image_id is not null
   and (
     select count(distinct creator.card_type)
       from public.creator_flashcards as creator
      where creator.creator_image_id = card.creator_image_id
        and creator.front = card.front
   ) = 1;

create or replace function public.assign_card_content_type()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.noun_id is not null then
    new.content_type := 'noun';
  elsif new.verb_id is not null then
    new.content_type := 'verb';
  elsif new.adjective_id is not null then
    new.content_type := 'adjective';
  elsif new.content_type is null and new.back like '%/vocab-images/nouns/%' then
    new.content_type := 'noun';
  elsif new.content_type is null and new.back like '%/vocab-images/verbs/%' then
    new.content_type := 'verb';
  elsif new.content_type is null and new.back like '%/vocab-images/adjectives/%' then
    new.content_type := 'adjective';
  elsif new.content_type is null and new.back like '%/vocab-images/prepositions/%' then
    new.content_type := 'preposition';
  elsif new.content_type is null and new.back like '%/vocab-images/phonics/%' then
    new.content_type := 'phonics';
  end if;
  return new;
end;
$$;

drop trigger if exists assign_card_content_type_on_cards on public.cards;
create trigger assign_card_content_type_on_cards
  before insert or update of noun_id, verb_id, adjective_id, back, content_type
  on public.cards
  for each row execute function public.assign_card_content_type();

create or replace function public.refresh_lesson_set_content_types(target_set_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.lesson_sets
     set content_types = coalesce(
       (
         select array_agg(distinct card.content_type order by card.content_type)
           from public.cards as card
          where card.lesson_set_id = target_set_id
            and card.content_type is not null
       ),
       array[]::text[]
     )
   where id = target_set_id;
$$;

revoke all on function public.refresh_lesson_set_content_types(uuid)
  from public, anon, authenticated;
grant execute on function public.refresh_lesson_set_content_types(uuid) to service_role;

create or replace function public.refresh_lesson_set_content_types_from_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.refresh_lesson_set_content_types(old.lesson_set_id);
  end if;
  if tg_op <> 'DELETE' then
    perform public.refresh_lesson_set_content_types(new.lesson_set_id);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.refresh_lesson_set_content_types_from_card()
  from public, anon, authenticated;
grant execute on function public.refresh_lesson_set_content_types_from_card() to service_role;

drop trigger if exists refresh_lesson_set_content_types_on_cards on public.cards;
create trigger refresh_lesson_set_content_types_on_cards
  after insert or delete or update of lesson_set_id, content_type
  on public.cards
  for each row execute function public.refresh_lesson_set_content_types_from_card();

update public.lesson_sets as lesson_set
   set content_types = coalesce(
     (
       select array_agg(distinct card.content_type order by card.content_type)
         from public.cards as card
        where card.lesson_set_id = lesson_set.id
          and card.content_type is not null
     ),
     array[]::text[]
   );

-- Preserve both card-level types and the set summary when copying Community sets.
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

  select * into source_set
    from public.lesson_sets
   where id = original_set
     and (is_public = true or user_id = auth.uid());
  if not found then
    raise exception 'Lesson set not found or is not available to copy.';
  end if;

  insert into public.lesson_sets (
    user_id, name, last_used, is_public, copied_from, tags, content_types
  )
  values (
    auth.uid(), source_set.name, now(), false, source_set.id,
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
  return new_set_id;
end;
$$;

revoke all on function public.copy_lesson_set(uuid) from public;
grant execute on function public.copy_lesson_set(uuid) to authenticated, service_role;
