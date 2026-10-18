# Jira-ready backlog: Policy Desk review platform

This backlog turns the proposed review-platform plans into individual Jira tickets. Create Jira issues from the ticket blocks below; the keys are deliberately omitted. Statuses were checked against the repository on 2026-10-18.

## Status legend

- **DONE (existing)** — functionality exists in the current product; no new Jira ticket is needed unless scope changes.
- **READY** — planned and can be refined into a ticket, but implementation has not started.
- **BLOCKED** — requires a product decision or an external contract/service before implementation can be completed.
- **FOLLOW-UP** — intentionally deferred until the core feature ships.

## Existing functionality (already present)

| Area | Status | Evidence |
| --- | --- | --- |
| Policy create/edit, draft/active/inactive lifecycle, date ranges, owner/creator and labels | DONE (existing) | `src/libs/policies/`, `src/components/policy-editor-dialog.tsx`, `src/components/policy-detail.tsx`, `supabase/schema.sql` |
| Reusable organization labels | DONE (existing) | `src/libs/labels/`, `src/pages/labels/page.tsx` |
| Email/password login and mock login | DONE (existing) | `src/libs/auth/`, `src/stores/auth-store.ts`, `src/pages/login/page.tsx` |
| Mock and Supabase data mode | DONE (existing) | `src/libs/*/mock.ts`, `src/libs/*/supabase.ts`, `.env.example` |
| Policy schedule and policy activity | DONE (existing) | `src/components/policy-schedule.tsx`, `src/pages/overview/page.tsx` |
| First-run onboarding, workspace setup choice, onboarding completion persistence | Not present | `.agents/knowledges/first-entry-user-story.md` is a proposal only; no onboarding route/state exists |
| Workspace member management, RBAC, repository links, review queue, vulnerability classifications, policy approval | Not present | Confirmed by `.agents/knowledges/review-platform-roadmap.md` and feature plan status sections |

The existing login system does not provide workspace membership or roles. Existing policy labels are not the vulnerability taxonomy needed for MR findings. The policy date schedule is not an MR review queue.

## Recommended delivery order

1. **Workspace and roles** — provides the authorization and ownership boundary for all shared records.
2. **First-run onboarding, policy-only path** — new users can reach the existing policy workspace without needing a provider connection.
3. **GitHub connection and PR ingestion** — first provider; keep GitLab for later. Import PRs and changed files.
4. **Onboarding repository path** — complete the optional connect/select/sync setup for teams that choose reviews.
5. **Skill detection contract and finding classifications** — agree on the external analyzer contract, then build the review feedback capability.
6. **Review assignment, queue, and configurable due times** — reviewers are members assigned per PR, not a workspace role.
7. **Policy approval workflow** — can proceed after roles; it is independent of repository ingestion and may run in parallel after the RBAC foundation.
8. **Training data export** — later, separately reviewed and governed; recording classifications is not model fine-tuning.

```text
Workspace/RBAC ──┬── GitHub PR ingestion ── Skill detection contract/findings ── Review queue & assignment
                 └── Policy approval
```

Policy-only users must be able to use the product without connecting a repository.

---

## Epic: First-run onboarding

### PD-ONB-1 — Persist workspace onboarding state and detect first entry

- **Status:** READY
- **Type:** Story
- **Priority:** High
- **Description:** Track onboarding completion per workspace and route only new workspaces through setup. Returning users should go directly to their workspace.
- **Acceptance criteria:**
  - A workspace has durable onboarding completion/setup state (for example `onboarding_completed_at` and a repository setup state).
  - Completion is stored server-side in production, not only in browser localStorage.
  - First-run detection works after sign-in and does not repeat after refresh, sign-out/sign-in, or a different browser session.
  - Existing users without an onboarding record are handled safely and sent to the normal dashboard unless explicitly designated as new.
  - Mock mode has equivalent behavior using mock persistence.
- **Dependencies:** PD-ORG-2.
- **References:** `.agents/knowledges/first-entry-user-story.md`.

### PD-ONB-2 — Build welcome page with a clear policies-only path

- **Status:** READY
- **Type:** Story
- **Priority:** High
- **Description:** Introduce the product's two use cases and let a new admin start managing policies immediately or choose optional repository setup.
- **Acceptance criteria:**
  - New workspace admin sees a dedicated welcome/setup page after sign-in; returning users skip it.
  - Page explains **Manage policies** and **Review repository changes** in plain language.
  - **Skip for now — use policies only** is clear and takes the user to the policy dashboard/first-policy flow.
  - Skipping does not block policy create/edit, labels, schedule, dashboard, or search.
  - No empty review queue or missing integration is presented as an error on the policies-only path.
  - User can later find repository connection in Integrations/settings.
  - Layout works on narrow screens, keyboard navigation, and reduced-motion settings.
- **Dependencies:** PD-ONB-1, existing auth and policy flows.

### PD-ONB-3 — Complete optional connect, repository selection, and first-sync onboarding

- **Status:** READY after GitHub connection is available
- **Type:** Story
- **Priority:** Medium
- **Description:** For users choosing repository review, carry them through provider authorization, repository selection, first sync, and a useful next step.
- **Acceptance criteria:**
  - Repository connection is explicitly optional and required permissions/data imported are explained before authorization.
  - User can connect GitHub, select repositories, see progress/errors, and proceed after sync.
  - Skip/cancel and provider failure leave the policies-only workspace available and preserve a way to connect later.
  - Successful sync leads to review guidance/queue; zero open PRs has a helpful empty state.
  - Onboarding completion records whether the user chose policies only or repository review.
  - GitLab appears only after its provider connection is implemented.
- **Dependencies:** PD-ONB-1, PD-GH-3, PD-GH-4, PD-GH-7.

### PD-ONB-4 — Add optional repository setup reminder for later

- **Status:** FOLLOW-UP
- **Type:** Story
- **Priority:** Low
- **Description:** Offer a dismissible Integrations/dashboard prompt to policy-only workspaces that may want repository review later.
- **Acceptance criteria:**
  - Prompt explains the benefit without interrupting policy tasks.
  - Admin can connect later or dismiss; dismissal is remembered per workspace/user as decided.
  - Members do not see admin-only connect actions.
  - Prompt is hidden when a repository is already connected or setup was explicitly dismissed.
- **Dependencies:** PD-ONB-3, PD-ORG-4.

---

## Epic: Workspace membership and permissions

### PD-ORG-1 — Define workspace and membership authorization model

- **Status:** READY
- **Type:** Story / architecture
- **Priority:** Highest; prerequisite for shared review platform
- **Description:** Define workspace ownership, membership, initial workspace creation, and `admin` / `member` permissions. A reviewer is a member assigned to an individual PR, not a permanent role.
- **Acceptance criteria:**
  - Workspace and membership identifiers/relationships are documented, including whether the first release creates one workspace per account or supports multiple.
  - Permissions matrix is agreed for policy editing, inviting members, repository management, assignments, MR review, and policy approval.
  - New users cannot grant themselves admin privileges through public signup or client-side metadata.
  - Deny-by-default behavior is specified when membership cannot be resolved.
- **Dependencies:** None.
- **References:** `.agents/knowledges/review-platform-roles-plan.md`.

### PD-ORG-2 — Add workspace membership schema and RLS

- **Status:** READY
- **Type:** Story
- **Priority:** Highest
- **Description:** Add workspace and membership persistence and enforce tenant boundaries for existing and upcoming records.
- **Acceptance criteria:**
  - Workspace and membership tables support `admin` and `member` roles and active/invited/disabled membership states.
  - Policies, labels, and activity are associated with a workspace or have a safe migration path from current `owner_id` records.
  - RLS prevents cross-workspace reads and writes and prevents members from changing their own role.
  - Existing single-user policy data has a documented/backfilled workspace ownership path.
  - Migration is repeatable and safe for a fresh database and an existing installation.
- **Dependencies:** PD-ORG-1.

### PD-ORG-3 — Implement invitations and member administration

- **Status:** READY
- **Type:** Story
- **Priority:** High
- **Description:** Let admins invite members, view membership, change roles, and deactivate/remove access.
- **Acceptance criteria:**
  - Admin can invite by email, see pending/accepted/disabled members, change a member between admin and member, and revoke access.
  - Members cannot access administration actions or assign themselves a role.
  - Mock mode supports realistic invitations and role changes without sending email.
  - Supabase mode uses a trusted invitation path and enforces authorization server-side/RLS.
- **Dependencies:** PD-ORG-2.

### PD-ORG-4 — Add role-aware permission checks to the client and data operations

- **Status:** READY
- **Type:** Story / security
- **Priority:** High
- **Description:** Apply the agreed permission matrix consistently across UI, database operations, and Edge Functions.
- **Acceptance criteria:**
  - Shared permission helpers expose current user's allowed actions without treating hidden UI as security enforcement.
  - Unauthorized database and function calls are rejected even when invoked outside the UI.
  - Admin-only controls are hidden or disabled with clear explanation for members.
  - Mock mode mirrors the same permission decisions.
- **Dependencies:** PD-ORG-1, PD-ORG-2.

---

## Epic: GitHub repositories and pull request ingestion

### PD-GH-1 — Create and configure GitHub App for read-only PR access

- **Status:** READY (requires operator setup)
- **Type:** Task
- **Priority:** High
- **Description:** Create a GitHub App for the product with least-privilege repository permissions and a test installation.
- **Acceptance criteria:**
  - App can be installed by a test organization/account and limited to selected repositories.
  - App has repository metadata read and pull requests read permissions only for the first release.
  - Webhook URL/events and secret rotation ownership are documented.
  - App ID/client details/private key/webhook secret are stored only in Supabase Edge Function secrets and local ignored function env files; none are exposed through `VITE_*` variables.
- **Dependencies:** Product owner/operator access to GitHub and Supabase; PD-ORG-1 for workspace connection ownership.
- **References:** `.agents/knowledges/repository-integration-plan.md`.

### PD-GH-2 — Add repository connection and PR/file-change database model

- **Status:** READY
- **Type:** Story
- **Priority:** High
- **Description:** Persist workspace-owned provider connections, selected repositories, imported pull requests, changed files, and webhook delivery IDs.
- **Acceptance criteria:**
  - Schema supports GitHub connection/installation metadata, repositories, normalized PRs, changed files, sync state, and webhook deliveries.
  - PR uniqueness prevents duplicates across retries; file records are replaced/upserted safely when the PR head SHA changes.
  - Changed-file rows include path, previous path for renames, status, additions, deletions, total changes, optional patch, and optional blob SHA.
  - RLS scopes user-visible records to the workspace; credentials/private signing material are not in browser-readable rows.
  - Migration strategy works alongside the current `supabase/schema.sql` setup.
- **Dependencies:** PD-ORG-2.

### PD-GH-3 — Implement secure GitHub App installation callback and connection lifecycle

- **Status:** READY
- **Type:** Story
- **Priority:** High
- **Description:** Allow an admin to connect, view, update repository selection, and disconnect a GitHub App installation.
- **Acceptance criteria:**
  - Admin can start installation and return to the correct workspace using a one-time state value.
  - Callback validates state and persists installation/account metadata without exposing installation tokens to the browser.
  - Only workspace admins can connect/disconnect shared repositories.
  - Disconnect stops future syncs and marks the connection/repositories unavailable without deleting review history unexpectedly.
  - Mock and Supabase adapters expose equivalent operations.
- **Dependencies:** PD-ORG-4, PD-GH-1, PD-GH-2.

### PD-GH-4 — Import open PRs and changed-file details

- **Status:** READY
- **Type:** Story
- **Priority:** High
- **Description:** Initial sync fetches open PRs from selected repositories and the file list for every PR, including added/changed/removed/renamed files.
- **Acceptance criteria:**
  - Backend creates short-lived GitHub installation tokens and calls GitHub REST APIs; tokens never reach the frontend.
  - Sync handles pagination for repository, PR, and changed-file lists and is safe to retry.
  - PR records include title, description, URL, author, source/target branches, head/base SHA, state, draft state, and timestamps.
  - File records include filename, status, additions/deletions/change total, rename source path where present, and patch when supplied.
  - UI can list PRs and show changed-file counts and file paths; missing patch text still leaves a useful file row and GitHub link.
  - Sync status and actionable errors are visible to admins.
- **Dependencies:** PD-GH-2, PD-GH-3.
- **Notes:** GitHub's changed-files endpoint has a 3,000-file cap per PR and may omit patches for some files. Do not promise full diffs for every file.

### PD-GH-5 — Add authenticated manual sync and scheduled reconciliation

- **Status:** READY
- **Type:** Story
- **Priority:** Medium
- **Description:** Keep repository and open-PR data current and recover from missed webhook events.
- **Acceptance criteria:**
  - Admin can trigger a sync for a connected repository; members cannot.
  - Scheduled reconciliation refreshes repository PR state and changed files.
  - Bounded retries, rate-limit handling, per-repository `last_synced_at`, status, and error details are recorded.
  - Re-running a sync does not create duplicate PRs or file rows.
- **Dependencies:** PD-GH-4.

### PD-GH-6 — Process signed GitHub PR webhooks

- **Status:** READY
- **Type:** Story / security
- **Priority:** High
- **Description:** Refresh PRs and files promptly when GitHub sends pull request events.
- **Acceptance criteria:**
  - Webhook verifies `X-Hub-Signature-256` over the raw body before processing.
  - Delivery ID is deduplicated; replayed events do not repeat side effects.
  - Relevant opened/reopened/synchronize/closed/ready-for-review/draft/edited actions refresh the canonical PR and file data.
  - Unrelated events and unknown installations are safely ignored and logged.
  - Webhook endpoint does not rely on a Supabase user JWT; it authenticates through GitHub's signature.
- **Dependencies:** PD-GH-1, PD-GH-2, PD-GH-4.

### PD-GH-7 — Build optional Integrations UI and mock GitHub data

- **Status:** READY
- **Type:** Story
- **Priority:** Medium
- **Description:** Let users discover/connect repositories without making repository setup mandatory for policy-only use.
- **Acceptance criteria:**
  - Integrations page distinguishes not connected, connected/no open PRs, syncing, synced, and error states.
  - Admin can connect, select/manage repositories, sync, and disconnect; member access follows the permission matrix.
  - Mock mode includes sample connected/disconnected states and sample PR/file data with no real GitHub credentials.
  - Navigation and route are added; policies remain usable when no repo is connected.
- **Dependencies:** PD-GH-3, PD-GH-4, PD-ORG-4.

### PD-GH-8 — Add GitLab provider adapter

- **Status:** FOLLOW-UP
- **Type:** Story
- **Priority:** Later
- **Description:** Add GitLab projects/MRs behind the same provider-neutral repository and review-request interfaces.
- **Acceptance criteria:**
  - GitLab connection/import/update/disconnect use the same Integrations and Review Queue UI.
  - GitLab merge requests and changed files map to the normalized schema without losing provider-specific identifiers/URLs.
  - Provider credentials remain server-side and webhook events are authenticated.
- **Dependencies:** PD-GH-2 through PD-GH-7; GitHub implementation proves the shared interface.

---

## Epic: Skill findings and vulnerability classifications

### PD-FIND-1 — Agree on Skill Detection service contract and vulnerability taxonomy

- **Status:** BLOCKED (external contract/product decision)
- **Type:** Spike
- **Priority:** High
- **Description:** Define how the external Skill Detection system sends findings for a PR/commit and how reviewers classify them.
- **Acceptance criteria:**
  - Request/response or event contract is documented with versioning and authentication.
  - Finding payload identifies repository, PR, head commit SHA, skill/policy, summary/details, detector/model version, and stable finding ID.
  - Initial vulnerability categories and whether one finding may have multiple categories are agreed.
  - Dispositions (for example confirmed, false positive, needs context) and taxonomy ownership are decided.
  - Contract is reviewed with the Skill Detection service owner.
- **Dependencies:** Skill Detection service owner; PD-GH-4 for repository/PR identity.

### PD-FIND-2 — Add findings and classification schema with audit provenance

- **Status:** READY after PD-FIND-1
- **Type:** Story
- **Priority:** High
- **Description:** Persist detected findings, controlled vulnerability categories, reviewer classifications, and review history separately from general policy labels.
- **Acceptance criteria:**
  - Schema records workspace, PR, commit SHA, finding source/version, category/taxonomy version, reviewer, disposition/note, and timestamps.
  - Vulnerability categories use stable IDs and are not stored as free-form policy organization labels.
  - RLS restricts feedback writes to admins or members assigned to the PR.
  - Classification changes are auditable and mock mode supports the same data flow.
- **Dependencies:** PD-ORG-2, PD-FIND-1, PD-GH-2.

### PD-FIND-3 — Display findings and capture reviewer classifications

- **Status:** READY after PD-FIND-2
- **Type:** Story
- **Priority:** High
- **Description:** Show skill findings on PR details and let authorized reviewers add categories, disposition, and notes.
- **Acceptance criteria:**
  - Finding is tied to the exact PR head commit and indicates when analysis is stale after a new commit.
  - Assigned member/admin can classify a finding and update their own review details according to permissions.
  - UI shows category, disposition, reviewer, and classification time.
  - Mock data covers empty, multiple findings, already classified, and stale analysis cases.
- **Dependencies:** PD-FIND-2, PD-GH-4, PD-ORG-4.

### PD-FIND-4 — Create a reviewed feedback export for future model work

- **Status:** FOLLOW-UP
- **Type:** Story / data governance
- **Priority:** Later
- **Description:** Provide an explicit, auditable export pipeline for curated reviewer feedback; no automatic model training is included.
- **Acceptance criteria:**
  - Export is permission-controlled and records who/when/which filters produced it.
  - Export preserves commit, detector, taxonomy, reviewer, and timestamp provenance.
  - Exclusions/redaction and retention policy are defined before production use.
  - Exported data is clearly not described as an automatically fine-tuned model.
- **Dependencies:** PD-FIND-3; data governance approval.

---

## Epic: Review queue, assignment, and adjustable review time

### PD-QUEUE-1 — Define review lifecycle, assignment, and SLA rules

- **Status:** READY
- **Type:** Spike
- **Priority:** High
- **Description:** Finalize assignment and due-time semantics before building the queue.
- **Acceptance criteria:**
  - Review states and transitions are defined (suggested: unassigned, assigned, in review, completed, dismissed).
  - Review time unit and calendar behavior are decided (suggested: wall-clock hours).
  - SLA start event is agreed (suggested: reviewer assignment); reassignment behavior is explicit.
  - Workspace default and per-PR override behavior is defined; changing defaults will not silently rewrite existing due dates.
- **Dependencies:** PD-ORG-1, PD-GH-4, PD-FIND-1.

### PD-QUEUE-2 — Add reviewer assignments, due timestamps, and review audit history

- **Status:** READY after PD-QUEUE-1
- **Type:** Story
- **Priority:** High
- **Description:** Persist PR reviewer assignment and a fixed due timestamp derived from the workspace SLA or an admin override.
- **Acceptance criteria:**
  - Admin can assign/reassign an active workspace member; a reviewer is not a separate global role.
  - Assignment start, due timestamp, status transitions, and administrative changes are auditable.
  - Inactive members cannot receive new assignments.
  - Mock and Supabase paths enforce equivalent rules and RLS.
- **Dependencies:** PD-ORG-2, PD-ORG-4, PD-GH-2, PD-QUEUE-1.

### PD-QUEUE-3 — Add workspace review SLA settings and per-PR override

- **Status:** READY after PD-QUEUE-1
- **Type:** Story
- **Priority:** Medium
- **Description:** Allow admins to set a default review duration and override it for an individual PR.
- **Acceptance criteria:**
  - Admin can set workspace default hours and timezone for display.
  - Admin can override a specific PR due timestamp/duration with a recorded reason or audit event.
  - Existing due timestamps do not change when the default SLA changes.
  - Due-soon/overdue calculations use saved deadlines and are covered by mock examples.
- **Dependencies:** PD-ORG-2, PD-QUEUE-1, PD-QUEUE-2.

### PD-QUEUE-4 — Build review queue, filters, and reviewer detail navigation

- **Status:** READY after PD-QUEUE-2
- **Type:** Story
- **Priority:** High
- **Description:** Give members and admins a single view of incoming PRs, assignments, findings, age, and due state.
- **Acceptance criteria:**
  - Queue shows repository, PR title/author, state, assigned member, finding summary, age, due time, and overdue/soon indicator.
  - Filters include mine/unassigned/all (permission-aware), state, repository, vulnerability category, and due status.
  - User can open internal PR details and the provider PR URL.
  - Empty/loading/error states are distinct and mock scenarios cover empty, unassigned, due soon, overdue, completed, and long titles.
- **Dependencies:** PD-QUEUE-2, PD-QUEUE-3, PD-GH-7, PD-FIND-3.

### PD-QUEUE-5 — Add reviewer actions and admin reassignment controls

- **Status:** READY after PD-QUEUE-4
- **Type:** Story
- **Priority:** Medium
- **Description:** Allow assigned members to progress review state and admins to reassign/override with audit history.
- **Acceptance criteria:**
  - Assigned reviewer can mark in review/completed/dismissed according to the approved state machine.
  - Admin can reassign and explicitly adjust a deadline.
  - Unauthorized members cannot change another review's assignment or decision.
  - Each action records actor and timestamp and appears in review history.
- **Dependencies:** PD-QUEUE-4.

---

## Epic: Policy approval workflow

### PD-APPROVAL-1 — Define policy submission, rejection, and approval invalidation rules

- **Status:** READY
- **Type:** Spike
- **Priority:** Medium; independent after RBAC
- **Description:** Decide which policy edits require reapproval and how admins handle self-approval.
- **Acceptance criteria:**
  - Lifecycle is agreed (suggested: draft → pending approval → active or rejected).
  - Material fields that invalidate approval are listed.
  - Self-approval rule is decided, including single-admin exception behavior.
  - Rejection reason and resubmission behavior are defined.
  - Effective date range remains separate from approval status.
- **Dependencies:** PD-ORG-1.

### PD-APPROVAL-2 — Add approval state and approval history persistence

- **Status:** READY after PD-APPROVAL-1
- **Type:** Story
- **Priority:** Medium
- **Description:** Extend policy persistence and lifecycle to track submission, decision, version, requester, approver, and decision note.
- **Acceptance criteria:**
  - Policies can represent pending approval and rejected states without overloading active/inactive/effective dates.
  - Approval history records policy version, requester, approver, decision, note, and timestamp.
  - RLS prevents members from approving/rejecting and prevents unauthorized activation.
  - Editing material fields reopens approval as defined in PD-APPROVAL-1.
  - Mock and Supabase implementations remain behaviorally consistent.
- **Dependencies:** PD-ORG-2, PD-ORG-4, PD-APPROVAL-1.

### PD-APPROVAL-3 — Add policy submit and admin decision UI

- **Status:** READY after PD-APPROVAL-2
- **Type:** Story
- **Priority:** Medium
- **Description:** Add submit-for-approval, approval inbox, approve/reject actions, and status visibility in policy views.
- **Acceptance criteria:**
  - Member can submit a draft and see pending/rejected state and any rejection reason.
  - Admin can approve or reject with optional/required note as defined by the workflow.
  - Policy list filters, detail view, dashboard metrics, and schedule render approval states correctly.
  - Existing direct admin policy workflows remain usable and date scheduling stays independent.
- **Dependencies:** PD-APPROVAL-2.

---

## Operational setup / release tickets

### PD-OPS-1 — Configure Supabase Edge Function secrets and deployment

- **Status:** BLOCKED until Supabase/GitHub app environments are available
- **Type:** Task
- **Priority:** High before production rollout
- **Description:** Configure local and deployed callback, sync, and webhook functions with the GitHub App secrets.
- **Acceptance criteria:**
  - Local secrets live in ignored `supabase/functions/.env`; production secrets are configured through Supabase Edge Function secrets.
  - Secret names and rotation steps are documented; no secret is committed or exposed in Vite env.
  - Callback, authenticated sync, and public signature-verified webhook have distinct authentication rules.
  - A test GitHub installation completes end-to-end sync in a non-production environment.
- **Dependencies:** PD-GH-1 through PD-GH-6; Supabase project access.

### PD-OPS-2 — Add production monitoring and failure runbook for provider sync

- **Status:** READY after initial GitHub sync
- **Type:** Task
- **Priority:** Medium
- **Description:** Make failed, delayed, or rate-limited GitHub sync operations diagnosable and recoverable.
- **Acceptance criteria:**
  - Logs identify workspace/repository/PR and delivery ID without logging tokens or private keys.
  - Admin-visible sync health distinguishes retryable provider errors from revoked access/configuration failures.
  - Runbook covers webhook secret rotation, App key rotation, rate limits, replay/retry, and disconnect/reconnect.
- **Dependencies:** PD-GH-4, PD-GH-5, PD-GH-6.

## Source plans and current context

- [Roadmap and current implementation status](review-platform-roadmap.md)
- [Workspace roles and member management](review-platform-roles-plan.md)
- [Repository integration and changed-file design](repository-integration-plan.md)
- [Skill findings and vulnerability classifications](mr-skill-review-plan.md)
- [Review queue and adjustable time](review-queue-plan.md)
- [Policy approval workflow](policy-approval-plan.md)
- [First-entry user story and optional repository connection](first-entry-user-story.md)
- [Project architecture and mock/production setup](skill-detection-project.md)
