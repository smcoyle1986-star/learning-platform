-- Read-only vocabulary reporting for the Classendo administrator dashboard.
-- The five existing vocabulary tables remain the source of truth. These
-- functions normalize them without adding duplicate content storage.

create or replace function public.admin_content_rows()
returns table (
  id text,
  lemma text,
  category text,
  themes text[],
  image_path text,
  audio_path text,
  worksheet_supported boolean,
  metadata jsonb,
  created_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    n.id::text,
    n.lemma::text,
    'noun'::text,
    coalesce(n.themes, '{}'::text[]),
    nullif(btrim(coalesce(n.image_id::text, '')), ''),
    nullif(btrim(coalesce(to_jsonb(n)->>'audio_url', to_jsonb(n)->>'audio_path', to_jsonb(n)->>'audio', '')), ''),
    nullif(btrim(n.lemma::text), '') is not null,
    jsonb_strip_nulls(jsonb_build_object(
      'part_of_speech', n.part_of_speech,
      'countability', n.countability,
      'difficulty', n.difficulty
    )),
    null::timestamptz
  from public.nouns n

  union all

  select
    v.id::text,
    v.lemma::text,
    'verb'::text,
    coalesce(v.themes, '{}'::text[]),
    nullif(btrim(coalesce(v.image_id::text, '')), ''),
    nullif(btrim(coalesce(to_jsonb(v)->>'audio_url', to_jsonb(v)->>'audio_path', to_jsonb(v)->>'audio', '')), ''),
    nullif(btrim(v.lemma::text), '') is not null,
    jsonb_strip_nulls(jsonb_build_object(
      'cefr_level', v.cefr_level,
      'is_irregular', v.is_irregular,
      'definition', v.definition
    )),
    v.created_at
  from public.verbs v

  union all

  select
    a.id::text,
    a.lemma::text,
    'adjective'::text,
    coalesce(a.themes, '{}'::text[]),
    nullif(btrim(coalesce(a.image_id::text, '')), ''),
    nullif(btrim(coalesce(to_jsonb(a)->>'audio_url', to_jsonb(a)->>'audio_path', to_jsonb(a)->>'audio', '')), ''),
    nullif(btrim(a.lemma::text), '') is not null,
    jsonb_strip_nulls(jsonb_build_object(
      'comparative', a.comparative,
      'superlative', a.superlative,
      'gradable', a.gradable
    )),
    a.created_at
  from public.adjectives a

  union all

  select
    p.id::text,
    p.lemma::text,
    'preposition'::text,
    coalesce(p.themes, '{}'::text[]),
    nullif(btrim(coalesce(p.image_id::text, '')), ''),
    nullif(btrim(coalesce(to_jsonb(p)->>'audio_url', to_jsonb(p)->>'audio_path', to_jsonb(p)->>'audio', '')), ''),
    nullif(btrim(p.lemma::text), '') is not null,
    jsonb_strip_nulls(jsonb_build_object('sub_category', p.category)),
    p.created_at
  from public.prepositions p

  union all

  select
    ph.id::text,
    ph.lemma::text,
    'phonics'::text,
    case when nullif(btrim(coalesce(ph.theme, '')), '') is null
      then '{}'::text[] else array[ph.theme::text] end,
    nullif(btrim(coalesce(ph.image_id::text, '')), ''),
    nullif(btrim(coalesce(to_jsonb(ph)->>'audio_url', to_jsonb(ph)->>'audio_path', to_jsonb(ph)->>'audio', '')), ''),
    coalesce(ph.is_active, true) and nullif(btrim(ph.lemma::text), '') is not null,
    jsonb_strip_nulls(jsonb_build_object(
      'difficulty', ph.difficulty,
      'is_active', ph.is_active
    )),
    ph.created_at
  from public.phonics ph;
$$;

create or replace function public.get_admin_content_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with rows as (
    select * from public.admin_content_rows()
  ),
  duplicate_groups as (
    select category, lower(btrim(lemma)) as normalized_lemma, count(*) as entry_count
      from rows
     where nullif(btrim(lemma), '') is not null
     group by category, lower(btrim(lemma))
    having count(*) > 1
  ),
  category_summary as (
    select
      category,
      count(*) as total,
      count(*) filter (where image_path is null) as missing_images,
      count(*) filter (where audio_path is null) as missing_audio,
      count(*) filter (where worksheet_supported) as worksheet_supported
    from rows
    group by category
  ),
  theme_values as (
    select distinct btrim(theme) as theme
      from rows, unnest(themes) as theme
     where nullif(btrim(theme), '') is not null
  )
  select jsonb_build_object(
    'total_entries', (select count(*) from rows),
    'missing_images', (select count(*) from rows where image_path is null),
    'missing_audio', (select count(*) from rows where audio_path is null),
    'worksheet_supported', (select count(*) from rows where worksheet_supported),
    'worksheet_unsupported', (select count(*) from rows where not worksheet_supported),
    'duplicate_groups', (select count(*) from duplicate_groups),
    'duplicate_entries', (select coalesce(sum(entry_count), 0) from duplicate_groups),
    'categories', (
      select coalesce(jsonb_object_agg(
        category,
        jsonb_build_object(
          'total', total,
          'missing_images', missing_images,
          'missing_audio', missing_audio,
          'worksheet_supported', worksheet_supported
        )
      ), '{}'::jsonb)
      from category_summary
    ),
    'themes', (
      select coalesce(jsonb_agg(theme order by theme), '[]'::jsonb)
      from theme_values
    )
  );
$$;

create or replace function public.get_admin_content_entries(
  search_query text default '',
  category_filter text default 'all',
  theme_filter text default 'all',
  report_filter text default 'all',
  page_size integer default 25,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_size integer := least(greatest(coalesce(page_size, 25), 1), 100);
  safe_offset integer := greatest(coalesce(page_offset, 0), 0);
  normalized_search text := lower(btrim(coalesce(search_query, '')));
  normalized_category text := lower(btrim(coalesce(category_filter, 'all')));
  normalized_theme text := lower(btrim(coalesce(theme_filter, 'all')));
  normalized_report text := lower(btrim(coalesce(report_filter, 'all')));
  total_count bigint := 0;
  rows_json jsonb := '[]'::jsonb;
begin
  with ranked as (
    select
      r.*,
      count(*) over (
        partition by r.category, lower(btrim(r.lemma))
      ) as duplicate_count
    from public.admin_content_rows() r
  ),
  filtered as (
    select * from ranked
     where (
       normalized_search = ''
       or lower(lemma) like '%' || normalized_search || '%'
       or exists (
         select 1 from unnest(themes) as theme
          where lower(theme) like '%' || normalized_search || '%'
       )
     )
       and (normalized_category = 'all' or category = normalized_category)
       and (
         normalized_theme = 'all'
         or exists (
           select 1 from unnest(themes) as theme
            where lower(theme) = normalized_theme
         )
       )
       and (
         normalized_report = 'all'
         or (normalized_report = 'missing_image' and image_path is null)
         or (normalized_report = 'missing_audio' and audio_path is null)
         or (normalized_report = 'duplicates' and duplicate_count > 1)
         or (normalized_report = 'worksheet_unsupported' and not worksheet_supported)
       )
  )
  select count(*) into total_count from filtered;

  with ranked as (
    select
      r.*,
      count(*) over (
        partition by r.category, lower(btrim(r.lemma))
      ) as duplicate_count
    from public.admin_content_rows() r
  ),
  filtered as (
    select * from ranked
     where (
       normalized_search = ''
       or lower(lemma) like '%' || normalized_search || '%'
       or exists (
         select 1 from unnest(themes) as theme
          where lower(theme) like '%' || normalized_search || '%'
       )
     )
       and (normalized_category = 'all' or category = normalized_category)
       and (
         normalized_theme = 'all'
         or exists (
           select 1 from unnest(themes) as theme
            where lower(theme) = normalized_theme
         )
       )
       and (
         normalized_report = 'all'
         or (normalized_report = 'missing_image' and image_path is null)
         or (normalized_report = 'missing_audio' and audio_path is null)
         or (normalized_report = 'duplicates' and duplicate_count > 1)
         or (normalized_report = 'worksheet_unsupported' and not worksheet_supported)
       )
     order by category, lower(lemma), id
     limit safe_size offset safe_offset
  )
  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb)
    into rows_json from filtered;

  return jsonb_build_object(
    'entries', rows_json,
    'total', total_count,
    'limit', safe_size,
    'offset', safe_offset
  );
end;
$$;

revoke all on function public.admin_content_rows() from public, anon, authenticated;
revoke all on function public.get_admin_content_summary() from public, anon, authenticated;
revoke all on function public.get_admin_content_entries(text, text, text, text, integer, integer)
  from public, anon, authenticated;

grant execute on function public.admin_content_rows() to service_role;
grant execute on function public.get_admin_content_summary() to service_role;
grant execute on function public.get_admin_content_entries(text, text, text, text, integer, integer)
  to service_role;
