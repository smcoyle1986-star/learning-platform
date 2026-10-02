-- Durable cleanup audit that survives deletion of the corresponding Auth row.
create table if not exists public.auth_user_cleanup_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text,
  created_at timestamptz not null,
  last_known_activity_at timestamptz,
  verification_status text not null check (verification_status in ('unverified')),
  content_checks jsonb not null,
  deletion_reason text not null,
  source text not null,
  requested_at timestamptz not null default now(),
  result text not null default 'pending' check (result in ('pending', 'succeeded', 'failed')),
  result_at timestamptz,
  error_message text
);

create index if not exists auth_user_cleanup_audit_user_requested_idx
  on public.auth_user_cleanup_audit (user_id, requested_at desc);

alter table public.auth_user_cleanup_audit enable row level security;
revoke all on public.auth_user_cleanup_audit from public, anon, authenticated;
grant select, insert, update on public.auth_user_cleanup_audit to service_role;
