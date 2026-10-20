# Plan: admin approval for policies

## Status

**DONE in application code and mock mode; production migration pending.** Policies move `draft → pending → active` or `rejected`. Admins approve, reject (with a required reason), and turn approved policies on or off. The FastAPI policy service enforces the workflow, and every decision is stored in `policy_approval_events` with the policy version, actor, note, and time. Apply [`20261021000000_policy_approval.sql`](../../apps/backend/supabase/migrations/20261021000000_policy_approval.sql) manually before using the feature against Supabase. Existing `active` and `inactive` policies are treated as approved.

Resolved decisions:

- **Self-approval:** another admin must approve a policy you submitted. If you are the only active admin, you can approve it yourself, and the history marks it as self-approved.
- **Material fields:** name, description, labels, and effective dates. Editing any of them increases the policy version, sends an approved policy back for review, and records a `reopened` event. Renaming or deleting a label in the label library does not reopen approval.
- **Rejection:** policies stay `rejected` with the reviewer's reason visible until the author edits or resubmits them.
- **Enforcement:** the approval workflow is enforced in the API. Approval events can only be written with the service role. Policy rows still use workspace-member RLS, so a client holding the Supabase anon key and a user JWT could bypass the API. The client never receives that key.

References: [policy lifecycle helpers](../../apps/client/src/libs/policies/status.ts), [policy repository types](../../apps/client/src/libs/policies/types.ts), [policy detail UI](../../apps/client/src/components/policy-detail.tsx), [Supabase schema](../../apps/backend/supabase/schema.sql).

## Dependencies

- [Workspace roles and member management](review-platform-roles-plan.md) to define trusted admin permissions.
- Policy lifecycle and schema updates in both mock and Supabase implementations.

## Proposed workflow

Suggested lifecycle: `draft → pending approval → active` or `rejected`; admins may deactivate an active policy. Keep effective start/end dates independent from the approval state. A policy approved for future dates can be scheduled and only become effective when its date range begins.

Store each decision in an approval history record: policy/version, requester, approver, decision, note, and timestamp. Editing a policy after approval should invalidate or reopen approval when a material field changes; define which fields count as material before implementation.

## Implementation sequence

1. Define submit/reject/resubmit semantics and policy fields that invalidate approval.
2. Extend policy type and lifecycle state without overloading effective date logic.
3. Add approval history schema and owner/workspace RLS; allow only authorized admins to approve/reject.
4. Add submit-for-approval and admin decision UI, then update policy detail, list filters, dashboard counts, and schedule display.
5. Mirror the workflow in mock storage and add clear empty/pending/rejected states.

## Decisions before implementation

- Can an admin approve their own policy? Suggested: require a different admin for separation of duties, with a documented exception if there is only one admin.
- Which fields invalidate approval after editing? Suggested: name, description, labels, status, and effective dates.
- Does a rejection return to draft or use a separate rejected state? Suggested: keep `rejected` visible with reason, then return to draft on resubmission.
