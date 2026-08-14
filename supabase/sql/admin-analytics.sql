-- Lightweight first-party analytics for Classendo.
-- Events intentionally exclude IP addresses, page URLs, and arbitrary
-- metadata. Existing durable counters remain authoritative where available.

-- The application already emits game-start events through /api/games/track-play.
-- Keep its lightweight backing table alongside the analytics migration so a
-- project that has not run the earlier optional migration still gets complete
-- reporting.
create table if not exists public.game_play_events (
  id uuid primary key default gen_random_uuid(),
  game_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  session_key text,
  created_at timestamptz not null default now(),
  constraint game_play_events_game_key_check
    check (char_length(game_key) between 1 and 120),
  constraint game_play_events_session_key_check
    check (session_key is null or char_length(session_key) <= 80)
);

create index if not exists game_play_events_game_key_created_at_idx
  on public.game_play_events (game_key, created_at desc);

create index if not exists game_play_events_created_at_idx
  on public.game_play_events (created_at desc);

alter table public.game_play_events enable row level security;
revoke all on table public.game_play_events from public, anon, authenticated;
grant select, insert on table public.game_play_events to service_role;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  event_key text,
  user_id uuid references auth.users(id) on delete set null,
  session_key text,
  item_key text,
  item_label text,
  category text,
  created_at timestamptz not null default now(),
  constraint analytics_events_type_check check (
    event_type in (
      'vocabulary_search',
      'flashcard_view',
      'worksheet_generated',
      'flashcards_opened',
      'classroom_opened',
      'lesson_pack_viewed',
      'lesson_pack_downloaded',
      'premium_upgrade'
    )
  ),
  constraint analytics_events_event_key_check
    check (event_key is null or char_length(event_key) <= 180),
  constraint analytics_events_session_key_check
    check (session_key is null or char_length(session_key) <= 80),
  constraint analytics_events_item_key_check
    check (item_key is null or char_length(item_key) <= 120),
  constraint analytics_events_item_label_check
    check (item_label is null or char_length(item_label) <= 120),
  constraint analytics_events_category_check
    check (category is null or char_length(category) <= 60)
);

alter table public.analytics_events
  drop constraint if exists analytics_events_type_check;

alter table public.analytics_events
  add constraint analytics_events_type_check check (
    event_type in (
      'vocabulary_search',
      'flashcard_view',
      'worksheet_generated',
      'flashcards_opened',
      'classroom_opened',
      'lesson_pack_viewed',
      'lesson_pack_downloaded',
      'premium_upgrade'
    )
  );

create unique index if not exists analytics_events_event_key_unique_idx
  on public.analytics_events (event_key)
  where event_key is not null;

create index if not exists analytics_events_type_created_idx
  on public.analytics_events (event_type, created_at desc);

create index if not exists analytics_events_item_created_idx
  on public.analytics_events (event_type, item_key, created_at desc);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc)
  where user_id is not null;

alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from public, anon, authenticated;
grant select, insert on table public.analytics_events to service_role;

create or replace function public.get_admin_analytics_snapshot(
  period_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_days integer := case
    when period_days is null or period_days <= 0 then null
    else least(period_days, 365)
  end;
  since_at timestamptz := case
    when period_days is null or period_days <= 0 then null
    else now() - make_interval(days => least(period_days, 365))
  end;
  trend_days integer := least(coalesce(safe_days, 90), 90);
  tracked_events bigint := 0;
  vocabulary_searches bigint := 0;
  flashcard_views bigint := 0;
  worksheet_generations bigint := 0;
  worksheet_saves bigint := 0;
  flashcards_opened bigint := 0;
  classroom_opens bigint := 0;
  guest_flashcards_opened bigint := 0;
  guest_classroom_opens bigint := 0;
  lesson_pack_views bigint := 0;
  lesson_pack_downloads bigint := 0;
  game_plays bigint := 0;
  premium_upgrades bigint := 0;
  new_users bigint := 0;
  community_uses bigint := 0;
  search_terms jsonb := '[]'::jsonb;
  flashcards jsonb := '[]'::jsonb;
  games jsonb := '[]'::jsonb;
  worksheets jsonb := '[]'::jsonb;
  lesson_packs jsonb := '[]'::jsonb;
  community_sets jsonb := '[]'::jsonb;
  trends jsonb := '[]'::jsonb;
begin
  select
    count(*),
    count(*) filter (where event_type = 'vocabulary_search'),
    count(*) filter (where event_type = 'flashcard_view'),
    count(*) filter (where event_type = 'worksheet_generated'),
    count(*) filter (where event_type = 'flashcards_opened'),
    count(*) filter (where event_type = 'classroom_opened'),
    count(*) filter (where event_type = 'flashcards_opened' and user_id is null),
    count(*) filter (where event_type = 'classroom_opened' and user_id is null),
    count(*) filter (where event_type = 'lesson_pack_viewed'),
    count(*) filter (where event_type = 'lesson_pack_downloaded'),
    count(*) filter (where event_type = 'premium_upgrade')
  into
    tracked_events,
    vocabulary_searches,
    flashcard_views,
    worksheet_generations,
    flashcards_opened,
    classroom_opens,
    guest_flashcards_opened,
    guest_classroom_opens,
    lesson_pack_views,
    lesson_pack_downloads,
    premium_upgrades
  from public.analytics_events
  where since_at is null or created_at >= since_at;

  select count(*) into worksheet_saves
    from public.worksheets
   where since_at is null or created_at >= since_at;

  select count(*) into game_plays
    from public.game_play_events
   where since_at is null or created_at >= since_at;

  select count(*) into new_users
    from auth.users
   where since_at is null or created_at >= since_at;

  select coalesce(sum(coalesce(download_count, 0) + coalesce(use_count, 0)), 0)
    into community_uses
    from public.lesson_sets
   where is_public = true
     and hidden_at is null
     and deleted_at is null;

  select coalesce(jsonb_agg(to_jsonb(ranked)), '[]'::jsonb)
    into search_terms
    from (
      select
        lower(btrim(item_label)) as key,
        min(item_label) as label,
        min(category) as category,
        count(*) as count
      from public.analytics_events
      where event_type = 'vocabulary_search'
        and nullif(btrim(item_label), '') is not null
        and (since_at is null or created_at >= since_at)
      group by lower(btrim(item_label))
      order by count(*) desc, lower(btrim(item_label))
      limit 8
    ) ranked;

  select coalesce(jsonb_agg(to_jsonb(ranked)), '[]'::jsonb)
    into flashcards
    from (
      select
        coalesce(nullif(item_key, ''), lower(btrim(item_label))) as key,
        min(item_label) as label,
        min(category) as category,
        count(*) as count
      from public.analytics_events
      where event_type = 'flashcard_view'
        and nullif(btrim(item_label), '') is not null
        and (since_at is null or created_at >= since_at)
      group by coalesce(nullif(item_key, ''), lower(btrim(item_label)))
      order by count(*) desc, min(item_label)
      limit 8
    ) ranked;

  select coalesce(jsonb_agg(to_jsonb(ranked)), '[]'::jsonb)
    into games
    from (
      select game_key as key, game_key as label, count(*) as count
        from public.game_play_events
       where since_at is null or created_at >= since_at
       group by game_key
       order by count(*) desc, game_key
       limit 8
    ) ranked;

  with generated as (
    select
      coalesce(nullif(item_key, ''), lower(btrim(item_label))) as key,
      min(item_label) as label,
      count(*) as generated_count
    from public.analytics_events
    where event_type = 'worksheet_generated'
      and nullif(btrim(item_label), '') is not null
      and (since_at is null or created_at >= since_at)
    group by coalesce(nullif(item_key, ''), lower(btrim(item_label)))
  ),
  saved as (
    select
      worksheet_type as key,
      worksheet_type as label,
      count(*) as saved_count
    from public.worksheets
    where since_at is null or created_at >= since_at
    group by worksheet_type
  ),
  combined as (
    select
      coalesce(g.key, s.key) as key,
      coalesce(g.label, s.label) as label,
      coalesce(g.generated_count, 0) as generated_count,
      coalesce(s.saved_count, 0) as saved_count,
      coalesce(g.generated_count, 0) + coalesce(s.saved_count, 0) as count
    from generated g
    full outer join saved s on s.key = g.key
    order by count desc, coalesce(g.label, s.label)
    limit 8
  )
  select coalesce(jsonb_agg(to_jsonb(combined)), '[]'::jsonb)
    into worksheets from combined;

  select coalesce(jsonb_agg(to_jsonb(ranked)), '[]'::jsonb)
    into community_sets
    from (
      select
        id::text as key,
        name as label,
        coalesce(download_count, 0) as downloads,
        coalesce(use_count, 0) as uses,
        coalesce(download_count, 0) + coalesce(use_count, 0) as count
      from public.lesson_sets
      where is_public = true
        and hidden_at is null
        and deleted_at is null
      order by count desc, created_at desc
      limit 8
    ) ranked;

  with viewed as (
    select coalesce(nullif(item_key, ''), lower(btrim(item_label))) as key,
           min(item_label) as label,
           count(*) as count
      from public.analytics_events
     where event_type = 'lesson_pack_viewed'
       and nullif(btrim(item_label), '') is not null
       and (since_at is null or created_at >= since_at)
     group by coalesce(nullif(item_key, ''), lower(btrim(item_label)))
  ), downloaded as (
    select coalesce(nullif(item_key, ''), lower(btrim(item_label))) as key,
           count(*) as downloads
      from public.analytics_events
     where event_type = 'lesson_pack_downloaded'
       and (since_at is null or created_at >= since_at)
     group by coalesce(nullif(item_key, ''), lower(btrim(item_label)))
  ), combined as (
    select coalesce(v.key, d.key) as key,
           coalesce(v.label, replace(d.key, '-', ' ')) as label,
           coalesce(v.count, 0) + coalesce(d.downloads, 0) as count,
           coalesce(d.downloads, 0) as downloads
      from viewed v full outer join downloaded d on d.key = v.key
     order by count desc, coalesce(v.label, d.key)
     limit 8
  )
  select coalesce(jsonb_agg(to_jsonb(combined)), '[]'::jsonb)
    into lesson_packs from combined;

  with days as (
    select generate_series(
      (current_date - (trend_days - 1))::date,
      current_date,
      interval '1 day'
    )::date as day
  ),
  event_counts as (
    select created_at::date as day, count(*) as count
      from public.analytics_events
     where created_at >= current_date - (trend_days - 1)
     group by created_at::date
  ),
  game_counts as (
    select created_at::date as day, count(*) as count
      from public.game_play_events
     where created_at >= current_date - (trend_days - 1)
     group by created_at::date
  ),
  user_counts as (
    select created_at::date as day, count(*) as count
      from auth.users
     where created_at >= current_date - (trend_days - 1)
     group by created_at::date
  ),
  trend_rows as (
    select
      d.day::text as date,
      coalesce(e.count, 0) as events,
      coalesce(g.count, 0) as game_plays,
      coalesce(u.count, 0) as new_users
    from days d
    left join event_counts e on e.day = d.day
    left join game_counts g on g.day = d.day
    left join user_counts u on u.day = d.day
    order by d.day
  )
  select coalesce(jsonb_agg(to_jsonb(trend_rows)), '[]'::jsonb)
    into trends from trend_rows;

  return jsonb_build_object(
    'period_days', safe_days,
    'generated_at', now(),
    'summary', jsonb_build_object(
      'tracked_events', tracked_events,
      'vocabulary_searches', vocabulary_searches,
      'flashcard_views', flashcard_views,
      'worksheet_generations', worksheet_generations,
      'worksheet_saves', worksheet_saves,
      'flashcards_opened', flashcards_opened,
      'classroom_opens', classroom_opens,
      'guest_flashcards_opened', guest_flashcards_opened,
      'guest_classroom_opens', guest_classroom_opens,
      'lesson_pack_views', lesson_pack_views,
      'lesson_pack_downloads', lesson_pack_downloads,
      'game_plays', game_plays,
      'premium_upgrades', premium_upgrades,
      'new_users', new_users,
      'community_uses', community_uses
    ),
    'search_terms', search_terms,
    'flashcards', flashcards,
    'games', games,
    'worksheets', worksheets,
    'lesson_packs', lesson_packs,
    'community_sets', community_sets,
    'trends', trends
  );
end;
$$;

revoke all on function public.get_admin_analytics_snapshot(integer)
  from public, anon, authenticated;
grant execute on function public.get_admin_analytics_snapshot(integer)
  to service_role;
