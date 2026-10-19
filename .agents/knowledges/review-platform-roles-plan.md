# Plan: workspace roles and member management

## Status

**DONE in application code and mock mode; production deployment remains pending.** Users can choose to create a workspace or join one with a time-limited code; signup does not silently create a workspace. Workspace admins can create/revoke join codes and manage members, invitations, roles, and access from the Team page. The authenticated `workspace-members` Supabase Edge Function and versioned migrations implement the production path. Deploy the migration and function manually before using these features against Supabase; database workflow jobs remain disabled as requested. Policies and labels are AI reference content, scoped to the selected workspace, and are not workspace business workflows.

References: [auth types](../../apps/client/src/libs/auth/types.ts), [Supabase auth adapter](../../apps/client/src/libs/auth/supabase.ts), [auth store](../../apps/client/src/stores/auth-store.ts), [current schema](../../apps/backend/supabase/schema.sql).

## Goal

Establish a trusted authorization model before implementing repository administration, MR assignment, or policy approvals.

## Proposed model

- Workspace roles: `admin` and `member`.
- “Reviewer” is not a role. It is an active member assigned to review a specific MR. The assignment grants review actions for that MR only.
- Admins manage workspace membership, roles, repository connections, reviewer assignments, and policy approvals.
- Members can use workspace features allowed to them and can act on MRs assigned to them.
- Default to deny when membership or permission cannot be resolved.

## Implementation sequence

1. **Done:** define the workspace and `admin`/`member` data model; add a migration for pending invites and membership email details.
2. **Done in code:** let a user explicitly create a workspace or join one using an admin-generated, expiring join code; do not auto-create a workspace at signup. Email invitations are also supported through the authenticated Edge Function.
3. **Done:** add Team UI for member listing, invitations, role changes, deactivation/reactivation, and removal.
4. **Done for membership actions:** enforce active membership and admin checks in the Edge Function; limit direct membership reads with RLS; protect the final active admin.
5. **Done:** implement matching mock-mode storage and behavior.
6. **Pending manual production setup:** apply the workspace migrations and deploy `workspace-members`. Database workflow jobs are deliberately disabled.
7. **Next:** define workspace access for repositories and review records. Keep AI policy and label content separate unless a concrete product need requires workspace ownership.

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

- Single-workspace first release or multi-workspace from the beginning? **Resolved:** support multiple workspaces; users explicitly create or join a workspace during setup.
- Can an admin also be assigned as an MR reviewer? Suggested: yes.
- Should members have additional capabilities beyond the matrix (for example, repository visibility or editing policies)? Confirm before RLS policies are finalized.
