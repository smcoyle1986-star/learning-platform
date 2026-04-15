create extension if not exists pg_trgm;

-- Supports fuzzy title search for community browsing and owned-set lookups.
create index if not exists lesson_sets_name_trgm_idx
  on public.lesson_sets using gin (name gin_trgm_ops);

-- Helps exact/contains-style tag lookups when community search expands beyond title.
create index if not exists lesson_sets_tags_gin_idx
  on public.lesson_sets using gin (tags);

-- Public browsing sorted by popularity.
create index if not exists lesson_sets_public_popular_idx
  on public.lesson_sets (download_count desc, created_at desc)
  where is_public = true;

-- Public browsing sorted by newest.
create index if not exists lesson_sets_public_newest_idx
  on public.lesson_sets (created_at desc)
  where is_public = true;

-- Owned/community-mixed browsing sorted by popularity for a single teacher.
create index if not exists lesson_sets_user_popular_idx
  on public.lesson_sets (user_id, download_count desc, created_at desc);

-- Owned/community-mixed browsing sorted by newest for a single teacher.
create index if not exists lesson_sets_user_newest_idx
  on public.lesson_sets (user_id, created_at desc);

-- Preview modal and community card image hydration both depend on ordered card reads.
create index if not exists cards_lesson_set_position_idx
  on public.cards (lesson_set_id, position);
