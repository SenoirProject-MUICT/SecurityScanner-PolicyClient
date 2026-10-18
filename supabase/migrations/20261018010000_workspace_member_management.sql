alter table public.workspace_memberships alter column user_id drop not null;
alter table public.workspace_memberships add column if not exists email text;
alter table public.workspace_memberships add column if not exists display_name text not null default '';
alter table public.workspace_memberships drop constraint if exists workspace_memberships_status_check;
alter table public.workspace_memberships add constraint workspace_memberships_status_check
  check (status in ('active', 'invited', 'disabled'));
update public.workspace_memberships membership
set email = users.email,
    display_name = coalesce(nullif(users.raw_user_meta_data ->> 'full_name', ''), nullif(users.raw_user_meta_data ->> 'name', ''), split_part(users.email, '@', 1))
from auth.users users
where membership.user_id = users.id and membership.email is null;

create unique index if not exists workspace_memberships_workspace_email_unique_idx
  on public.workspace_memberships (workspace_id, lower(email)) where email is not null;

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
drop policy if exists "Users can read their own workspace memberships" on public.workspace_memberships;
create policy "Users can read their own workspace memberships" on public.workspace_memberships
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Workspace members can read their workspace" on public.workspaces;
create policy "Workspace members can read their workspace" on public.workspaces
  for select to authenticated using (
    exists (
      select 1 from public.workspace_memberships membership
      where membership.workspace_id = public.workspaces.id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  );
