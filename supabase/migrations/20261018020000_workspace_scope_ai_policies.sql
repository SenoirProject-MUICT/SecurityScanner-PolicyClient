alter table public.policies add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.policy_labels add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.policy_activity add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

alter table public.policies alter column owner_id drop not null;
alter table public.policies drop constraint if exists policies_owner_id_fkey;
alter table public.policies add constraint policies_owner_id_fkey foreign key (owner_id) references auth.users(id) on delete set null;
alter table public.policy_labels alter column owner_id drop not null;
alter table public.policy_labels drop constraint if exists policy_labels_owner_id_fkey;
alter table public.policy_labels add constraint policy_labels_owner_id_fkey foreign key (owner_id) references auth.users(id) on delete set null;

-- Give existing content owners a personal workspace if they do not have one.
with content_owners as (
  select owner_id as user_id from public.policies where owner_id is not null
  union select owner_id from public.policy_labels where owner_id is not null
  union select owner_id from public.policy_activity where owner_id is not null
), owners_without_membership as (
  select owner.user_id from content_owners owner
  where not exists (select 1 from public.workspace_memberships membership where membership.user_id = owner.user_id)
), existing_workspaces as (
  select distinct on (workspace.created_by) workspace.created_by as user_id, workspace.id as workspace_id
  from public.workspaces workspace join content_owners owner on owner.user_id = workspace.created_by
  order by workspace.created_by, workspace.created_at, workspace.id
), new_workspaces as (
  insert into public.workspaces (name, created_by)
  select coalesce(nullif(users.raw_user_meta_data ->> 'full_name', ''), nullif(users.raw_user_meta_data ->> 'name', ''), split_part(users.email, '@', 1), 'My workspace') || '’s workspace', owner.user_id
  from owners_without_membership owner
  join auth.users users on users.id = owner.user_id
  where not exists (select 1 from existing_workspaces workspace where workspace.user_id = owner.user_id)
  returning id, created_by
), primary_workspaces as (
  select user_id, workspace_id from existing_workspaces
  union all
  select created_by, id from new_workspaces
)
insert into public.workspace_memberships (workspace_id, user_id, email, display_name, role, status, is_default)
select workspace.workspace_id, workspace.user_id, users.email,
  coalesce(nullif(users.raw_user_meta_data ->> 'full_name', ''), nullif(users.raw_user_meta_data ->> 'name', ''), split_part(users.email, '@', 1), 'Workspace member'),
  'admin', 'active', not exists (
    select 1 from public.workspace_memberships active_default
    where active_default.user_id = workspace.user_id and active_default.status = 'active' and active_default.is_default
  )
from primary_workspaces workspace
join content_owners owner on owner.user_id = workspace.user_id
join auth.users users on users.id = workspace.user_id
where not exists (select 1 from public.workspace_memberships membership where membership.user_id = workspace.user_id)
on conflict (workspace_id, user_id) do nothing;

with content_owners as (
  select owner_id as user_id from public.policies where owner_id is not null
  union select owner_id from public.policy_labels where owner_id is not null
  union select owner_id from public.policy_activity where owner_id is not null
), users_without_default as (
  select distinct owner.user_id from content_owners owner
  where exists (select 1 from public.workspace_memberships membership where membership.user_id = owner.user_id and membership.status = 'active')
    and not exists (select 1 from public.workspace_memberships membership where membership.user_id = owner.user_id and membership.status = 'active' and membership.is_default)
)
update public.workspace_memberships target
set is_default = true, updated_at = now()
from users_without_default owner
where target.id = (
  select candidate.id from public.workspace_memberships candidate
  where candidate.user_id = owner.user_id and candidate.status = 'active'
  order by candidate.created_at, candidate.id limit 1
);

update public.policies policy
set workspace_id = (select candidate.workspace_id from public.workspace_memberships candidate
  where candidate.user_id = policy.owner_id
  order by (candidate.status = 'active' and candidate.is_default) desc, (candidate.status = 'active') desc, candidate.created_at
  limit 1)
where policy.workspace_id is null and policy.owner_id is not null;

update public.policy_labels label
set workspace_id = (select candidate.workspace_id from public.workspace_memberships candidate
  where candidate.user_id = label.owner_id
  order by (candidate.status = 'active' and candidate.is_default) desc, (candidate.status = 'active') desc, candidate.created_at
  limit 1)
where label.workspace_id is null and label.owner_id is not null;

update public.policy_activity activity
set workspace_id = (select candidate.workspace_id from public.workspace_memberships candidate
  where candidate.user_id = activity.owner_id
  order by (candidate.status = 'active' and candidate.is_default) desc, (candidate.status = 'active') desc, candidate.created_at
  limit 1)
where activity.workspace_id is null and activity.owner_id is not null;

-- Labels are unique within the shared workspace library, not per author.
delete from public.policy_labels duplicate
using public.policy_labels kept
where duplicate.workspace_id = kept.workspace_id
  and lower(duplicate.name) = lower(kept.name)
  and (duplicate.created_at, duplicate.id) > (kept.created_at, kept.id);

alter table public.policy_labels alter column workspace_id set not null;
alter table public.policy_activity alter column workspace_id set not null;
alter table public.policies alter column workspace_id set not null;
alter table public.policy_labels drop constraint if exists policy_labels_owner_name_unique;
drop index if exists public.policy_labels_owner_lower_name_unique;
create unique index if not exists policy_labels_workspace_lower_name_unique on public.policy_labels (workspace_id, lower(name));
create index if not exists policy_labels_workspace_name_idx on public.policy_labels (workspace_id, name);
create index if not exists policies_workspace_updated_idx on public.policies (workspace_id, updated_at desc);
create index if not exists policy_activity_workspace_occurred_idx on public.policy_activity (workspace_id, occurred_at desc);

-- Workspace membership is the tenant boundary for AI policy content and its history.
drop policy if exists "Users can read their policies" on public.policies;
create policy "Workspace members can read policies" on public.policies for select to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policies.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
drop policy if exists "Users can create their policies" on public.policies;
create policy "Workspace members can create policies" on public.policies for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policies.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
drop policy if exists "Users can update their policies" on public.policies;
create policy "Workspace members can update policies" on public.policies for update to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policies.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
) with check (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policies.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
drop policy if exists "Users can delete their policies" on public.policies;
create policy "Workspace members can delete policies" on public.policies for delete to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policies.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);

drop policy if exists "Users can read their policy labels" on public.policy_labels;
create policy "Workspace members can read policy labels" on public.policy_labels for select to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policy_labels.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
drop policy if exists "Users can create their policy labels" on public.policy_labels;
create policy "Workspace members can create policy labels" on public.policy_labels for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policy_labels.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
drop policy if exists "Users can update their policy labels" on public.policy_labels;
create policy "Workspace members can update policy labels" on public.policy_labels for update to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policy_labels.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
) with check (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policy_labels.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
drop policy if exists "Users can delete their policy labels" on public.policy_labels;
create policy "Workspace members can delete policy labels" on public.policy_labels for delete to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policy_labels.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);

drop policy if exists "Users can read their policy activity" on public.policy_activity;
create policy "Workspace members can read policy activity" on public.policy_activity for select to authenticated using (
  exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policy_activity.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
drop policy if exists "Users can create their policy activity" on public.policy_activity;
create policy "Workspace members can create policy activity" on public.policy_activity for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (select 1 from public.workspace_memberships membership where membership.workspace_id = policy_activity.workspace_id and membership.user_id = (select auth.uid()) and membership.status = 'active')
);
