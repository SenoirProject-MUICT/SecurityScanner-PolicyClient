-- Policy Desk database baseline. Deploy changes through versioned files in supabase/migrations.

-- Role and workspace data model. Workspace creation, membership provisioning,
-- authorization decisions, and role-driven workflows are implemented in the app.
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_memberships_user_unique unique (workspace_id, user_id)
);

create index if not exists workspace_memberships_user_status_idx
  on public.workspace_memberships (user_id, status, is_default desc);
create unique index if not exists workspace_memberships_one_default_per_user_idx
  on public.workspace_memberships (user_id) where is_default and status = 'active';

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  created_by text not null default 'Unknown member',
  name text not null,
  description text not null default '',
  labels text[] not null default '{}',
  status text not null default 'active' check (status in ('draft', 'active', 'inactive')),
  effective_from date,
  effective_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint policy_effective_dates_valid check (effective_until is null or effective_from is null or effective_until >= effective_from)
);

-- Upgrade existing installations without removing policy data.
alter table public.policies add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.policies add column if not exists created_by text not null default 'Unknown member';
alter table public.policies add column if not exists labels text[] not null default '{}';
-- Existing databases may still have a legacy skills column. The app no longer reads or writes it.
alter table public.policies add column if not exists status text not null default 'active';
alter table public.policies add column if not exists effective_from date;
alter table public.policies add column if not exists effective_until date;

create index if not exists policies_owner_updated_idx on public.policies (owner_id, updated_at desc);
alter table public.policies enable row level security;

drop policy if exists "Users can read their policies" on public.policies;
create policy "Users can read their policies" on public.policies for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "Users can create their policies" on public.policies;
create policy "Users can create their policies" on public.policies for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "Users can update their policies" on public.policies;
create policy "Users can update their policies" on public.policies for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "Users can delete their policies" on public.policies;
create policy "Users can delete their policies" on public.policies for delete to authenticated using (owner_id = (select auth.uid()));

create table if not exists public.policy_labels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_by text not null default 'Unknown member',
  name text not null check (char_length(name) between 2 and 32),
  created_at timestamptz not null default now(),
  constraint policy_labels_owner_name_unique unique (owner_id, name)
);


create index if not exists policy_labels_owner_name_idx on public.policy_labels (owner_id, name);
create unique index if not exists policy_labels_owner_lower_name_unique on public.policy_labels (owner_id, lower(name));
alter table public.policy_labels enable row level security;

drop policy if exists "Users can read their policy labels" on public.policy_labels;
create policy "Users can read their policy labels" on public.policy_labels for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "Users can create their policy labels" on public.policy_labels;
create policy "Users can create their policy labels" on public.policy_labels for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "Users can update their policy labels" on public.policy_labels;
create policy "Users can update their policy labels" on public.policy_labels for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "Users can delete their policy labels" on public.policy_labels;
create policy "Users can delete their policy labels" on public.policy_labels for delete to authenticated using (owner_id = (select auth.uid()));

-- Policy activity history powers the dashboard's additions, removals, drafts, and scheduled events chart.
create table if not exists public.policy_activity (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  policy_id uuid not null,
  policy_name text not null,
  activity_type text not null check (activity_type in ('added', 'removed', 'draft', 'scheduled')),
  occurred_at timestamptz not null default now()
);
create index if not exists policy_activity_owner_occurred_idx on public.policy_activity (owner_id, occurred_at desc);
alter table public.policy_activity enable row level security;
drop policy if exists "Users can read their policy activity" on public.policy_activity;
create policy "Users can read their policy activity" on public.policy_activity for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "Users can create their policy activity" on public.policy_activity;
create policy "Users can create their policy activity" on public.policy_activity for insert to authenticated with check (owner_id = (select auth.uid()));
