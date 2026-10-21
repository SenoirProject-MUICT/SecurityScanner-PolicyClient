-- GitHub repository integration. The FastAPI repository services own every write:
-- they verify membership and the admin role, then use the service role. Members
-- read connections, repositories, and review requests through RLS. GitHub App
-- secrets and installation tokens are never stored in these tables.
create table if not exists public.repository_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('github')),
  installation_id bigint not null,
  account_login text not null,
  account_type text not null check (account_type in ('User', 'Organization')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repository_connections_installation_unique unique (provider, installation_id)
);
create index if not exists repository_connections_workspace_idx on public.repository_connections (workspace_id);

create table if not exists public.repositories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid not null references public.repository_connections(id) on delete cascade,
  provider text not null check (provider in ('github')),
  provider_repository_id bigint not null,
  owner text not null,
  name text not null,
  full_name text not null,
  html_url text not null,
  default_branch text not null default '',
  is_private boolean not null default false,
  sync_status text not null default 'idle' check (sync_status in ('idle', 'syncing', 'succeeded', 'failed')),
  sync_error text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repositories_provider_repository_unique unique (provider, provider_repository_id)
);
create index if not exists repositories_workspace_connection_idx on public.repositories (workspace_id, connection_id);

create table if not exists public.merge_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  repository_id uuid not null references public.repositories(id) on delete cascade,
  provider text not null check (provider in ('github')),
  provider_request_id bigint not null,
  number integer not null,
  title text not null,
  description text not null default '',
  html_url text not null,
  state text not null check (state in ('open', 'closed', 'merged')),
  is_draft boolean not null default false,
  author_login text not null default '',
  author_avatar_url text,
  source_branch text not null default '',
  target_branch text not null default '',
  head_sha text not null default '',
  base_sha text not null default '',
  files_added integer not null default 0,
  files_modified integer not null default 0,
  files_removed integer not null default 0,
  files_renamed integer not null default 0,
  additions integer not null default 0,
  deletions integer not null default 0,
  provider_created_at timestamptz not null,
  provider_updated_at timestamptz not null,
  closed_at timestamptz,
  merged_at timestamptz,
  last_synced_at timestamptz not null default now(),
  constraint merge_requests_provider_request_unique unique (provider, repository_id, provider_request_id)
);
create index if not exists merge_requests_workspace_state_updated_idx
  on public.merge_requests (workspace_id, state, provider_updated_at desc);

create table if not exists public.merge_request_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  merge_request_id uuid not null references public.merge_requests(id) on delete cascade,
  filename text not null,
  previous_filename text,
  status text not null check (status in ('added', 'modified', 'removed', 'renamed')),
  additions integer not null default 0,
  deletions integer not null default 0,
  changes integer not null default 0,
  patch text,
  blob_sha text,
  constraint merge_request_files_filename_unique unique (merge_request_id, filename)
);

-- Delivery IDs give replay protection for signed GitHub webhooks.
create table if not exists public.provider_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('github')),
  delivery_id text not null,
  event text not null,
  action text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  outcome text not null default 'pending' check (outcome in ('pending', 'processed', 'ignored', 'failed')),
  error text,
  constraint provider_webhook_deliveries_delivery_unique unique (provider, delivery_id)
);

alter table public.repository_connections enable row level security;
alter table public.repositories enable row level security;
alter table public.merge_requests enable row level security;
alter table public.merge_request_files enable row level security;
-- No policies: only the service role reads or writes webhook deliveries.
alter table public.provider_webhook_deliveries enable row level security;

revoke insert, update, delete on table public.repository_connections from anon, authenticated;
revoke insert, update, delete on table public.repositories from anon, authenticated;
revoke insert, update, delete on table public.merge_requests from anon, authenticated;
revoke insert, update, delete on table public.merge_request_files from anon, authenticated;
revoke all on table public.provider_webhook_deliveries from anon, authenticated;

drop policy if exists "Workspace members can read repository connections" on public.repository_connections;
create policy "Workspace members can read repository connections" on public.repository_connections for select to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = repository_connections.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
drop policy if exists "Workspace members can read repositories" on public.repositories;
create policy "Workspace members can read repositories" on public.repositories for select to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = repositories.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
drop policy if exists "Workspace members can read merge requests" on public.merge_requests;
create policy "Workspace members can read merge requests" on public.merge_requests for select to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = merge_requests.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
drop policy if exists "Workspace members can read merge request files" on public.merge_request_files;
create policy "Workspace members can read merge request files" on public.merge_request_files for select to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = merge_request_files.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
