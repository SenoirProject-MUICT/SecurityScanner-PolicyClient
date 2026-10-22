# Policy approval

A workspace member creates a policy and either saves it as a draft or submits it for approval. A workspace admin approves or rejects it. Approved policies become `Active` and can be turned off or on by admins, and every step is recorded in the policy's activity history.

## Sub-features

- `policy-create-submit` creates a policy from the editor and submits it in one step.
- `policy-create-draft` saves a policy as a draft without submitting.
- `policy-self-approve` lets a sole admin approve their own submission, recorded as self-approved.
- `policy-reject` rejects with a required reason, and the author sees it and can resubmit.
- `policy-toggle` turns an approved policy off and on (admins only).

## How to get to it (user POV)

- Sidebar **Policies** → **New policy** (`/<workspaceId>/policies`).
- Open a policy card → the policy detail page (`/<workspaceId>/policies/<policyId>`) → the **Approval** card.
- On a draft or rejected policy, the **Submit for approval** / **Resubmit** buttons on the approval card.

## Driving it with playwright-core

Journey: `node journeys/policy-approval.mjs` covers `policy-create-submit` and `policy-self-approve` (verified PASS).

Preconditions:

- `DOCTOR OK`. A fresh user from `signUp` and a fresh workspace from `createWorkspace`, so the user is the only admin.

- **Open editor.** Go to `/<workspaceId>/policies` and click `getByRole('button', { name: 'New policy' }).first()`. Dialog `Create a policy` opens.
- **Fill.** `getByLabel('Policy name')` (3–80 chars) and `getByLabel(/Summary/)`. The **Applies** toggle group (`aria-label="Policy duration"`) defaults to `Permanent`.
- **Submit.** Click `Submit for approval` in the dialog. The URL becomes `/policies/<uuid>`, heading `Waiting for approval` shows, with the hint `You’re the only admin, so you can approve your own submission.` `network.log` has `POST 201 …/policies`.
- **Save draft instead.** Click `Save as draft`. The approval heading reads `Not submitted`, and the card's `Submit for approval` button opens dialog `Submit for approval` with confirm button `Submit`.
- **Approve.** Click `Approve`. Dialog `Approve this policy` opens; fill `getByLabel(/Approval note/)` and click its `Approve` button (`exact: true`). Heading `Approved` shows, the status badge reads `Active`, and history shows `approved` with the `Self-approved · only admin` badge.
- **Reject.** Click `Reject`. Dialog `Reject this policy` requires the `Reason` field. Confirm with `Reject`. The heading reads `Changes requested`, and the reason is quoted on the card.
- **Toggle.** On an approved policy, the switch is labelled `Turn policy off` / `Turn policy on`. The status changes between `Active` and `Inactive`.
- **Proof.** `sql("select status, version, name from public.policies where id = '<id>'")` gives `active` after approval. `sql("select action, self_approved, note from public.policy_approval_events where policy_id = '<id>' order by occurred_at")` gives `submitted`, then `approved` with `self_approved = t` and the note.

## Gotchas

- With two or more active admins, the submitter can't approve their own submission (the `Approve` button is disabled with "another admin needs to approve it"). Testing cross-admin approval needs a second user who joined via a join code and was promoted to admin.
- There are two `New policy` buttons when the library is empty (header and empty state). Use `.first()`.
- The approve dialog's confirm button is also named `Approve`. Scope it to the dialog and use `exact: true`.
- A toast like `Policy approved` is not proof. Assert the `Approved` heading and the DB rows.
- DB status values are `draft`, `pending`, `active`, `inactive` and `rejected`. "Approved" in the UI is `active` in the DB.
