-- Store only hashes of time-limited workspace join codes. The authenticated
-- Edge Function is the only interface for creating, listing, revoking, or
-- redeeming codes; no direct client policies are granted.
create table if not exists public.workspace_join_codes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint workspace_join_codes_expiration_valid check (expires_at > created_at)
);

create index if not exists workspace_join_codes_workspace_created_idx
  on public.workspace_join_codes (workspace_id, created_at desc);

alter table public.workspace_join_codes enable row level security;
revoke all on table public.workspace_join_codes from anon, authenticated;
