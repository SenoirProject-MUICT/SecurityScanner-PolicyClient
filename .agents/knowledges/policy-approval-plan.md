# Plan: admin approval for policies

## Status

Not implemented. Current policy statuses are `draft`, `active`, and `inactive`; there is no pending approval status, approver identity, approval history, or enforcement that only an admin can activate a submitted policy.

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
