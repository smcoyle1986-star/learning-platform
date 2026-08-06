-- Worksheet dashboard organisation and Community sharing support.

alter table public.worksheets
  add column if not exists is_favorite boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists last_used timestamptz,
  add column if not exists use_count integer not null default 0,
  add column if not exists download_count integer not null default 0,
  add column if not exists content_types text[] not null default '{}'::text[],
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists copied_from uuid references public.worksheets(id) on delete set null;

alter table public.worksheets
  drop constraint if exists worksheets_content_types_check;
alter table public.worksheets
  add constraint worksheets_content_types_check
  check (content_types <@ array['noun', 'verb', 'adjective', 'preposition', 'phonics']::text[]);

create or replace function public.derive_worksheet_content_types()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select coalesce(array_agg(distinct card_type order by card_type), '{}'::text[])
    into new.content_types
  from (
    select lower(coalesce(card->>'type', card->>'content_type')) as card_type
    from jsonb_array_elements(coalesce(new.cards, '[]'::jsonb)) as card
  ) typed_cards
  where card_type in ('noun', 'verb', 'adjective', 'preposition', 'phonics');
  return new;
end;
$$;

drop trigger if exists derive_worksheet_content_types_on_write on public.worksheets;
create trigger derive_worksheet_content_types_on_write
  before insert or update of cards on public.worksheets
  for each row execute function public.derive_worksheet_content_types();

update public.worksheets set cards = cards;

create index if not exists worksheets_user_library_idx
  on public.worksheets (user_id, archived_at, is_favorite, last_used desc, updated_at desc);

create index if not exists worksheets_public_community_idx
  on public.worksheets (worksheet_type, download_count desc, created_at desc)
  where is_public = true and archived_at is null;

create index if not exists worksheets_public_content_types_idx
  on public.worksheets using gin (content_types)
  where is_public = true and archived_at is null;

create unique index if not exists worksheets_user_source_copy_idx
  on public.worksheets (user_id, copied_from)
  where copied_from is not null;

alter table public.worksheets enable row level security;

drop policy if exists "worksheets_select_visible" on public.worksheets;
create policy "worksheets_select_visible"
  on public.worksheets for select
  to authenticated
  using (is_public = true or user_id = auth.uid());

drop policy if exists "worksheets_insert_own" on public.worksheets;
create policy "worksheets_insert_own"
  on public.worksheets for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "worksheets_update_own" on public.worksheets;
create policy "worksheets_update_own"
  on public.worksheets for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "worksheets_delete_own" on public.worksheets;
create policy "worksheets_delete_own"
  on public.worksheets for delete
  to authenticated
  using (user_id = auth.uid());
