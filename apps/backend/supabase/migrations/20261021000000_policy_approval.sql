-- Admin approval for policies. The FastAPI policy service owns the workflow:
-- draft → pending → active or rejected; admins may deactivate and reactivate
-- approved policies. Existing active and inactive policies are treated as approved.
alter table public.policies drop constraint if exists policies_status_check;
alter table public.policies add constraint policies_status_check
  check (status in ('draft', 'pending', 'active', 'inactive', 'rejected'));
alter table public.policies alter column status set default 'draft';

-- The version increases when a material field changes, so each decision is tied
-- to the exact content that was reviewed.
alter table public.policies add column if not exists version integer not null default 1;
alter table public.policies add column if not exists submitted_by uuid references auth.users(id) on delete set null;
alter table public.policies add column if not exists submitted_at timestamptz;

-- Approval history is append-only and written by the API with the service role
-- after it verifies workspace membership and the admin role.
create table if not exists public.policy_approval_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  policy_id uuid not null,
  policy_name text not null,
  policy_version integer not null,
  action text not null check (action in ('submitted', 'approved', 'rejected', 'reopened', 'deactivated', 'reactivated')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default 'Unknown member',
  note text not null default '' check (char_length(note) <= 1000),
  self_approved boolean not null default false,
  occurred_at timestamptz not null default now()
);
create index if not exists policy_approval_events_policy_occurred_idx
  on public.policy_approval_events (workspace_id, policy_id, occurred_at desc);

alter table public.policy_approval_events enable row level security;
revoke insert, update, delete on table public.policy_approval_events from anon, authenticated;
drop policy if exists "Workspace members can read policy approval events" on public.policy_approval_events;
create policy "Workspace members can read policy approval events" on public.policy_approval_events for select to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policy_approval_events.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
