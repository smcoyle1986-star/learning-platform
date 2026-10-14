-- Keep dashboard list responses page-sized while preserving exact library totals.
-- The API supplies the authenticated account ID and calls this service-role-only RPC.
create or replace function public.dashboard_lesson_library_counts(
  p_user_id uuid,
  p_include_locked boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select count(*) filter (where archived_at is null) as all_count,
           count(*) filter (where archived_at is null and is_favorite) as favorite_count,
           count(*) filter (where archived_at is null and is_public) as public_count,
           count(*) filter (where archived_at is null and not is_public) as private_count,
           count(*) filter (where archived_at is not null) as archive_count
    from public.lesson_sets
    where user_id = p_user_id
  )
  select jsonb_build_object(
    'all', all_count,
    'favorites', favorite_count,
    'public', public_count,
    'private', private_count,
    'locked', case when p_include_locked
      then (select count(*) from public.dashboard_locked_lesson_ids(p_user_id))
      else 0 end,
    'archive', archive_count
  )
  from counts;
$$;

revoke all on function public.dashboard_lesson_library_counts(uuid, boolean) from public, anon, authenticated;
grant execute on function public.dashboard_lesson_library_counts(uuid, boolean) to service_role;

create or replace function public.dashboard_lesson_page_metadata(
  p_user_id uuid,
  p_lesson_ids uuid[],
  p_include_card_count boolean default true
)
returns table (
  lesson_id uuid,
  card_count bigint,
  contains_premium_images boolean,
  basic_conversion_available boolean,
  basic_version_available boolean,
  premium_images_need_conversion boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with visible_sets as (
    select ls.id, coalesce(ls.basic_active, true) as basic_active
    from public.lesson_sets ls
    where ls.user_id = p_user_id
      and ls.id = any(coalesce(p_lesson_ids, array[]::uuid[]))
  ),
  card_flags as (
    select c.lesson_set_id,
           c.id as card_id,
           c.creator_image_id is not null as has_creator_image,
           coalesce(c.basic_back_override, '') <> '' as has_basic_override,
           exists (
             select 1
             from public.vocab_images premium
             where premium.is_premium is true
               and c.back is not null
               and right(split_part(c.back, '?', 1), length(premium.image_path)) = premium.image_path
           ) as has_premium_variant,
           exists (
             select 1
             from public.vocab_images premium
             where premium.is_premium is true
               and c.back is not null
               and right(split_part(c.back, '?', 1), length(premium.image_path)) = premium.image_path
               and not exists (
                 select 1
                 from public.vocab_images free
                 where free.is_premium is not true
                   and free.image_path is not null
                   and (
                     (premium.noun_id is not null and free.noun_id = premium.noun_id)
                     or (premium.noun_id is null and free.category = premium.category and free.lemma = premium.lemma)
                   )
               )
           ) as has_unconvertible_variant
    from visible_sets s
    join public.cards c on c.lesson_set_id = s.id
  ),
  per_set as (
    select s.id,
           s.basic_active,
           count(cf.card_id) as card_count,
           coalesce(bool_or(cf.has_creator_image or cf.has_premium_variant), false) as contains_premium_images,
           coalesce(bool_and(not (cf.has_creator_image or cf.has_unconvertible_variant)), true) as basic_conversion_available,
           coalesce(bool_or((cf.has_creator_image or cf.has_premium_variant) and not cf.has_basic_override), false) as premium_images_need_conversion
    from visible_sets s
    left join card_flags cf on cf.lesson_set_id = s.id
    group by s.id, s.basic_active
  )
  select p.id,
         case when p_include_card_count then p.card_count else null end,
         p.contains_premium_images,
         p.basic_conversion_available,
         p.contains_premium_images and not p.premium_images_need_conversion,
         p.premium_images_need_conversion
  from per_set p;
$$;

revoke all on function public.dashboard_lesson_page_metadata(uuid, uuid[], boolean) from public, anon, authenticated;
grant execute on function public.dashboard_lesson_page_metadata(uuid, uuid[], boolean) to service_role;

-- Card counts are required across all matching worksheets only for the explicit
-- card-count sort. For other sorts, count cards only on the selected page.
create or replace function public.dashboard_worksheets_page(
  p_user_id uuid,
  p_page integer default 1,
  p_page_size integer default 12,
  p_search text default '',
  p_filter text default 'all',
  p_sort text default 'recent'
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with owned as (
    select w.id, w.name, w.user_id, w.worksheet_type, w.is_public,
           w.created_at, w.updated_at, w.last_used, w.use_count,
           w.download_count, w.copied_from, w.is_favorite, w.archived_at,
           w.content_types, w.tags
    from public.worksheets w
    where w.user_id = p_user_id
  ),
  matched as (
    select o.*
    from owned o
    where case p_filter
      when 'archive' then o.archived_at is not null
      when 'favorites' then o.archived_at is null and o.is_favorite
      when 'public' then o.archived_at is null and o.is_public
      when 'private' then o.archived_at is null and not o.is_public
      else o.archived_at is null
    end
      and (coalesce(p_search, '') = '' or
        o.name ilike '%' || replace(replace(replace(p_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
        or (lower(p_search) = 'bullseye' and o.worksheet_type = 'ladders-and-slides')
        or o.worksheet_type ilike '%' || replace(replace(replace(p_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
        or exists (
          select 1
          from public.worksheets searched
          cross join lateral jsonb_array_elements(coalesce(searched.cards, '[]'::jsonb)) as card(value)
          where searched.id = o.id
            and coalesce(card.value->>'front', card.value->>'word', '') ilike '%' || replace(replace(replace(p_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
        )
      )
  ),
  card_rank as (
    select m.id, jsonb_array_length(coalesce(w.cards, '[]'::jsonb)) as card_count
    from matched m
    join public.worksheets w on w.id = m.id and w.user_id = p_user_id
    where p_sort = 'cards'
  ),
  page_ids as (
    select m.id, cr.card_count as ranked_card_count
    from matched m
    left join card_rank cr on cr.id = m.id
    order by
      case when p_sort = 'name' then lower(m.name) end asc,
      case when p_sort = 'popular' then m.use_count end desc,
      case when p_sort = 'cards' then cr.card_count end desc,
      case when p_sort = 'newest' then m.created_at end desc,
      case when p_sort = 'oldest' then m.created_at end asc,
      case when p_sort = 'recent' then coalesce(m.last_used, m.updated_at) end desc,
      m.updated_at desc
    offset greatest(p_page - 1, 0) * least(greatest(p_page_size, 1), 36)
    limit least(greatest(p_page_size, 1), 36)
  ),
  page_rows as (
    select m.*, coalesce(p.ranked_card_count, jsonb_array_length(coalesce(w.cards, '[]'::jsonb))) as card_count
    from page_ids p
    join matched m on m.id = p.id
    join public.worksheets w on w.id = p.id and w.user_id = p_user_id
  ),
  active_counts as (
    select count(*) filter (where archived_at is null) as all_count,
           count(*) filter (where archived_at is null and is_favorite) as favorite_count,
           count(*) filter (where archived_at is null and is_public) as public_count,
           count(*) filter (where archived_at is null and not is_public) as private_count,
           count(*) filter (where archived_at is not null) as archive_count
    from owned
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'user_id', user_id, 'worksheet_type', worksheet_type,
      'is_public', is_public, 'created_at', created_at, 'updated_at', updated_at,
      'last_used', last_used, 'use_count', use_count, 'download_count', download_count,
      'copied_from', copied_from, 'is_favorite', is_favorite, 'archived_at', archived_at,
      'content_types', content_types, 'tags', tags, 'cardCount', card_count
    ) order by
      case when p_sort = 'name' then lower(name) end asc,
      case when p_sort = 'popular' then use_count end desc,
      case when p_sort = 'cards' then card_count end desc,
      case when p_sort = 'newest' then created_at end desc,
      case when p_sort = 'oldest' then created_at end asc,
      case when p_sort = 'recent' then coalesce(last_used, updated_at) end desc,
      updated_at desc
    ) from page_rows), '[]'::jsonb),
    'total', (select count(*) from matched),
    'counts', (select jsonb_build_object('all', all_count, 'favorites', favorite_count,
      'public', public_count, 'private', private_count, 'archive', archive_count) from active_counts),
    'page', greatest(p_page, 1), 'pageSize', least(greatest(p_page_size, 1), 36)
  );
$$;

revoke all on function public.dashboard_worksheets_page(uuid, integer, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.dashboard_worksheets_page(uuid, integer, integer, text, text, text) to service_role;
