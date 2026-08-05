-- Creator foundation: private user uploads, reusable creator cards, and mixed lesson sets.
-- This migration is intentionally UI-agnostic. It can be reapplied safely.

create table if not exists public.creator_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  status text not null default 'uploading',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint creator_images_owner_image_key unique (id, user_id),
  constraint creator_images_mime_type_check
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint creator_images_size_check
    check (size_bytes > 0 and size_bytes <= 10485760),
  constraint creator_images_width_check check (width is null or width > 0),
  constraint creator_images_height_check check (height is null or height > 0),
  constraint creator_images_status_check
    check (status in ('uploading', 'ready', 'rejected'))
);

create table if not exists public.creator_flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  creator_image_id uuid not null,
  front text not null,
  card_type text not null default 'custom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_flashcards_image_owner_fk
    foreign key (creator_image_id, user_id)
    references public.creator_images(id, user_id)
    on delete restrict,
  constraint creator_flashcards_front_check
    check (char_length(btrim(front)) between 1 and 200),
  constraint creator_flashcards_card_type_check
    check (char_length(btrim(card_type)) between 1 and 40)
);

alter table public.cards
  add column if not exists creator_image_id uuid
  references public.creator_images(id)
  on delete restrict;

create index if not exists creator_images_user_created_idx
  on public.creator_images (user_id, created_at desc)
  where deleted_at is null;

create index if not exists creator_flashcards_user_created_idx
  on public.creator_flashcards (user_id, created_at desc);

create index if not exists creator_flashcards_image_idx
  on public.creator_flashcards (creator_image_id);

create index if not exists cards_creator_image_idx
  on public.cards (creator_image_id)
  where creator_image_id is not null;

create or replace function public.set_creator_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_creator_images_updated_at on public.creator_images;
create trigger set_creator_images_updated_at
  before update on public.creator_images
  for each row execute function public.set_creator_updated_at();

drop trigger if exists set_creator_flashcards_updated_at on public.creator_flashcards;
create trigger set_creator_flashcards_updated_at
  before update on public.creator_flashcards
  for each row execute function public.set_creator_updated_at();

-- Access is granted to the uploader, through a public lesson set, or through a
-- copied/private lesson set owned by the current user. Keeping this rule in one
-- security-definer function avoids recursive RLS checks across the three tables.
create or replace function public.can_access_creator_image(target_image_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.creator_images ci
    where ci.id = target_image_id
      and ci.deleted_at is null
      and (
        ci.user_id = auth.uid()
        or exists (
          select 1
          from public.cards c
          join public.lesson_sets ls on ls.id = c.lesson_set_id
          where c.creator_image_id = ci.id
            and (ls.is_public = true or ls.user_id = auth.uid())
        )
      )
  );
$$;

create or replace function public.can_access_creator_image_path(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.creator_images ci
    where ci.storage_path = target_path
      and public.can_access_creator_image(ci.id)
  );
$$;

revoke all on function public.can_access_creator_image(uuid) from public;
revoke all on function public.can_access_creator_image_path(text) from public;
grant execute on function public.can_access_creator_image(uuid) to anon, authenticated, service_role;
grant execute on function public.can_access_creator_image_path(text) to anon, authenticated, service_role;

alter table public.creator_images enable row level security;
alter table public.creator_flashcards enable row level security;

drop policy if exists "creator_images_select_accessible" on public.creator_images;
create policy "creator_images_select_accessible"
  on public.creator_images
  for select
  to anon, authenticated
  using (public.can_access_creator_image(id));

drop policy if exists "creator_images_insert_own_premium" on public.creator_images;
create policy "creator_images_insert_own_premium"
  on public.creator_images
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.has_premium_access(auth.uid())
    and storage_path like auth.uid()::text || '/%'
  );

drop policy if exists "creator_images_update_own_premium" on public.creator_images;
create policy "creator_images_update_own_premium"
  on public.creator_images
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.has_premium_access(auth.uid())
  )
  with check (
    auth.uid() = user_id
    and public.has_premium_access(auth.uid())
    and storage_path like auth.uid()::text || '/%'
  );

drop policy if exists "creator_images_delete_own_premium" on public.creator_images;
create policy "creator_images_delete_own_premium"
  on public.creator_images
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and public.has_premium_access(auth.uid())
  );

drop policy if exists "creator_flashcards_select_own" on public.creator_flashcards;
create policy "creator_flashcards_select_own"
  on public.creator_flashcards
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "creator_flashcards_insert_own_premium" on public.creator_flashcards;
create policy "creator_flashcards_insert_own_premium"
  on public.creator_flashcards
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.has_premium_access(auth.uid())
  );

drop policy if exists "creator_flashcards_update_own_premium" on public.creator_flashcards;
create policy "creator_flashcards_update_own_premium"
  on public.creator_flashcards
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.has_premium_access(auth.uid())
  )
  with check (
    auth.uid() = user_id
    and public.has_premium_access(auth.uid())
  );

drop policy if exists "creator_flashcards_delete_own_premium" on public.creator_flashcards;
create policy "creator_flashcards_delete_own_premium"
  on public.creator_flashcards
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and public.has_premium_access(auth.uid())
  );

grant select, insert, update, delete on public.creator_images to authenticated;
grant select on public.creator_images to anon;
grant select, insert, update, delete on public.creator_flashcards to authenticated;

-- Private, immutable uploads. Replacement and deletion will go through the
-- future server API so referenced lesson/community images cannot be broken.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-images',
  'creator-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "creator_images_storage_select_accessible" on storage.objects;
create policy "creator_images_storage_select_accessible"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'creator-images'
    and public.can_access_creator_image_path(name)
  );

drop policy if exists "creator_images_storage_insert_own_premium" on storage.objects;
create policy "creator_images_storage_insert_own_premium"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'creator-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_premium_access(auth.uid())
  );

-- Preserve creator-image references when a public/community set is copied.
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

  select *
  into source_set
  from public.lesson_sets
  where id = original_set
    and (is_public = true or user_id = auth.uid());

  if not found then
    raise exception 'Lesson set not found or is not available to copy.';
  end if;

  insert into public.lesson_sets (
    user_id,
    name,
    last_used,
    is_public,
    copied_from,
    tags
  )
  values (
    auth.uid(),
    source_set.name,
    now(),
    false,
    source_set.id,
    coalesce(source_set.tags, array[]::text[])
  )
  returning id into new_set_id;

  insert into public.cards (
    lesson_set_id,
    front,
    back,
    position,
    creator_image_id
  )
  select
    new_set_id,
    front,
    back,
    position,
    creator_image_id
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

