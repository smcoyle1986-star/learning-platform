-- Saved lesson-library organisation for the teacher dashboard.
-- Favourites remain visible in the normal library; archived sets are preserved
-- and shown only through the dashboard's Archive filter.

alter table public.lesson_sets
  add column if not exists is_favorite boolean not null default false,
  add column if not exists archived_at timestamptz;

create index if not exists lesson_sets_user_library_idx
  on public.lesson_sets (user_id, archived_at, is_favorite, last_used desc);
