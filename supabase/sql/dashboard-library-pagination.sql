-- Lightweight dashboard lock index lookup. The API invokes this only with the
-- authenticated account ID and the service role; browser roles cannot call it.
create or replace function public.dashboard_locked_lesson_ids(p_user_id uuid)
returns table (lesson_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select ls.id
  from public.lesson_sets ls
  where ls.user_id = p_user_id
    and ls.archived_at is null
    and (
      not coalesce(ls.basic_active, true)
      or exists (
        select 1
        from public.cards c
        where c.lesson_set_id = ls.id
          and coalesce(c.basic_back_override, '') = ''
          and (
            c.creator_image_id is not null
            or exists (
              select 1
              from public.vocab_images vi
              where vi.is_premium is true
                and c.back is not null
                and right(split_part(c.back, '?', 1), length(vi.image_path)) = vi.image_path
            )
          )
      )
    );
$$;

revoke all on function public.dashboard_locked_lesson_ids(uuid) from public, anon, authenticated;
grant execute on function public.dashboard_locked_lesson_ids(uuid) to service_role;

create index if not exists vocab_images_premium_path_idx
  on public.vocab_images (image_path)
  where is_premium is true;

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
           w.content_types, w.tags,
           jsonb_array_length(coalesce(w.cards, '[]'::jsonb)) as card_count,
           w.cards
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
          select 1 from jsonb_array_elements(coalesce(o.cards, '[]'::jsonb)) as card(value)
          where coalesce(card.value->>'front', card.value->>'word', '') ilike '%' || replace(replace(replace(p_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
        )
      )
  ),
  active_counts as (
    select count(*) filter (where archived_at is null) as all_count,
           count(*) filter (where archived_at is null and is_favorite) as favorite_count,
           count(*) filter (where archived_at is null and is_public) as public_count,
           count(*) filter (where archived_at is null and not is_public) as private_count,
           count(*) filter (where archived_at is not null) as archive_count
    from owned
  ),
  page_rows as (
    select m.*
    from matched m
    order by
      case when p_sort = 'name' then lower(m.name) end asc,
      case when p_sort = 'popular' then m.use_count end desc,
      case when p_sort = 'cards' then m.card_count end desc,
      case when p_sort = 'newest' then m.created_at end desc,
      case when p_sort = 'oldest' then m.created_at end asc,
      case when p_sort = 'recent' then coalesce(m.last_used, m.updated_at) end desc,
      m.updated_at desc
    offset greatest(p_page - 1, 0) * greatest(p_page_size, 1)
    limit greatest(p_page_size, 1)
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
    'page', greatest(p_page, 1), 'pageSize', greatest(p_page_size, 1)
  );
$$;

revoke all on function public.dashboard_worksheets_page(uuid, integer, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.dashboard_worksheets_page(uuid, integer, integer, text, text, text) to service_role;

create or replace function public.dashboard_locked_lesson_count(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.dashboard_locked_lesson_ids(p_user_id);
$$;

revoke all on function public.dashboard_locked_lesson_count(uuid) from public, anon, authenticated;
grant execute on function public.dashboard_locked_lesson_count(uuid) to service_role;
