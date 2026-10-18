# Plan: workspace roles and member management

## Status

Not implemented. Current login/signup/profile flows use Supabase Auth or mock auth, but the user model contains only id, email, and name. There is no workspace membership table, role, member admin UI, or role-based access enforcement.

References: [auth types](../../src/libs/auth/types.ts), [Supabase auth adapter](../../src/libs/auth/supabase.ts), [auth store](../../src/stores/auth-store.ts), [current schema](../../supabase/schema.sql).

## Goal

Establish a trusted authorization model before implementing repository administration, MR assignment, or policy approvals.

## Proposed model

- Workspace roles: `admin` and `member`.
- “Reviewer” is not a role. It is an active member assigned to review a specific MR. The assignment grants review actions for that MR only.
- Admins manage workspace membership, roles, repository connections, reviewer assignments, and policy approvals.
- Members can use workspace features allowed to them and can act on MRs assigned to them.
- Default to deny when membership or permission cannot be resolved.

## Implementation sequence

1. Define workspace/membership data model and whether initial deployment supports one workspace or multiple.
2. Add invitation/provisioning using Supabase Auth; do not let a public client signup assign privileged roles.
3. Add `admin`/`member` management UI: invite, list, edit role, deactivate/remove.
4. Centralize permission checks for UI display while enforcing the same decisions in database RLS and trusted server functions.
5. Add mock membership and role behavior so UI contributions can be exercised without Supabase.

## Initial permission proposal

| Capability | Admin | Member |
| --- | --- | --- |
| Invite, deactivate, and assign workspace roles | Yes | No |
| Connect/disconnect shared repositories | Yes | No |
| View workspace MRs and skill findings | Yes | Yes |
| Assign/reassign reviewers and set review due dates | Yes | No by default |
| Review an MR assigned to this member | Yes | Yes |
| Add vulnerability classifications/notes | Yes | On assigned MRs |
| Create/edit policies | Yes | Yes, subject to approval |
| Approve/reject policy publication | Yes | No |

## Decisions before implementation

- Single-workspace first release or multi-workspace from the beginning? Suggested: model workspace IDs from day one, even if the UI creates one workspace initially.
- Can an admin also be assigned as an MR reviewer? Suggested: yes.
- Should members have additional capabilities beyond the matrix (for example, repository visibility or editing policies)? Confirm before RLS policies are finalized.
