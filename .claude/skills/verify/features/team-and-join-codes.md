# Team and join codes

Workspace admins manage members on the **Team** page: invite by email, change a member's status, remove members, and create time-limited join codes. Admins can reveal and revoke codes. Another user enters a code on the setup screen or picker to join.

## Sub-features

- `team-invite` invites a member by email with a workspace role.
- `joincode-create` creates a join code.
- `joincode-reveal` reveals and copies an existing code (admins only).
- `joincode-revoke` revokes a code.
- `joincode-join` lets a second user join a workspace with a code.
- `member-status` and `member-remove` disable or re-enable a member, or remove one.

## How to get to it (user POV)

- Sidebar **Team** (`/<workspaceId>/team`).
- Workspace settings → `Manage members`.
- As the joining user: setup screen → **Join with a code**, or picker → **Join with code**.

## Driving it with playwright-core

No journey yet; these steps have not been executed. Joining needs two browser contexts (admin and joiner), so open a second `browser.newContext()` in the journey.

Preconditions:

- `DOCTOR OK`. User A has signed up and created a workspace; user B has signed up with no workspace.

- **Create code (A).** On `/team` click `Create join code`, then `Create code` in the dialog. The code shows once (format `PD-XXXX-…`).
- **Reveal (A).** Click `Reveal join code` on the code row, then `Copy join code`. Toast `Join code copied`.
- **Join (B).** Setup screen → `Join with a code` → `Join code` field → `Join workspace`. B lands on the picker with A's workspace, not labelled `Admin`.
- **Revoke (A).** `Revoke` → dialog `Revoke this join code?` → confirm. Toast `Join code revoked`. B's further attempts with that code fail with an alert.
- **Disable member (A).** Change B's status. B's next load shows `Access is disabled` with `Check access` and `Sign out`.
- **Proof.** `sql("select user_id, role, status from public.workspace_memberships where workspace_id = '<id>'")` and `sql("select revoked_at is not null from public.workspace_join_codes where workspace_id = '<id>'")`.

## Gotchas

- Code reveal decrypts with `POLICYDESK_JOIN_CODE_ENCRYPTION_KEY`. `up.sh` sets a fixed local key, so codes created before a restart with a different key can't be revealed.
- Column names in the proof SQL are from the migrations. Check `apps/backend/supabase/migrations/2026101900*` if a query errors.
- The `Invite a member` flow goes through Supabase Auth admin APIs. Invitation emails land in local Mailpit at `http://127.0.0.1:54324`, not a real inbox.
