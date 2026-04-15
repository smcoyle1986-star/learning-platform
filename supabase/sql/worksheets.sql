create table if not exists public.worksheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  worksheet_type text not null,
  is_public boolean not null default true,
  cards jsonb not null default '[]'::jsonb,
  draft jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists worksheets_user_updated_idx
  on public.worksheets (user_id, updated_at desc);

create index if not exists worksheets_public_type_idx
  on public.worksheets (worksheet_type, updated_at desc)
  where is_public = true;
