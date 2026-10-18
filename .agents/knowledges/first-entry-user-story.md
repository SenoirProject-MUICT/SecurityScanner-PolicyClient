# First-entry user story

## Purpose

Policy Desk serves two valid needs: teams who only manage policies and teams who also review skill findings from Git repositories. Repository connection must be offered during first entry, but it is optional. A user must be able to use the complete policy-management experience without connecting GitHub or GitLab.

**Workspace setup is implemented:** an authenticated user without a workspace chooses to create one or join with an admin-provided time-limited code. Repository connection and review workflows are not implemented yet; the optional repository-onboarding path below remains a proposal. See the [review platform roadmap](review-platform-roadmap.md) and [project context](skill-detection-project.md).

## Primary user story

**As a new workspace admin, I want to understand the two ways to use Policy Desk and choose whether to connect a repository, so I can start managing policies immediately or set up MR reviews when my team needs them.**

## First entry experience

1. The user signs in or creates an account. The current auth UI is in [src/pages/login/page.tsx](../../src/pages/login/page.tsx); workspace protection and loading are handled by [src/app/router.tsx](../../src/app/router.tsx).
2. If the user has no workspace, [the workspace setup page](../../src/pages/workspace-setup/page.tsx) offers **Create a workspace** and **Join with a code**. Workspace creation is explicit; signup does not silently create a personal workspace. Users with a selected workspace continue to the app.
3. Explain the two paths in plain language:
   - **Manage policies** — create, organize, schedule, and maintain policies. No repository connection required.
   - **Review repository changes** — connect GitHub or GitLab to import pull/merge requests and review detected skill findings.
4. Present **Connect a repository** as an optional next step, with a concise explanation of required access and what will be imported. Show provider choices only when the integration has been implemented.
5. Provide a similarly clear **Skip for now — use policies only** action. It should lead directly to the policy workspace and remain available even when repository integration is configured.
6. After either choice, take the user to a useful workspace state: policy dashboard for policy-only use; repository sync/first-review guidance for users who connected a repository.

## Stories by path

### Policies-only path

As a user who only needs policy management, I can skip repository setup, create my first policy and labels, and use the dashboard, policy schedule, search, and policy details without seeing empty MR/reviewer panels as errors or blockers.

### Repository-review path

As a workspace admin who wants MR review, I can choose a provider, authorize the minimum necessary repository access, select repositories, and see sync progress. When sync completes, I can review imported items, assign a member, and understand what happens next. If no MRs or findings are found, show a helpful empty state and keep policy management available.

## Acceptance criteria

- Repository connection is optional; skipping never blocks access to policy features.
- The product explains what connecting a repo enables before asking for authorization.
- Workspace selection persists through the workspace store. Repository onboarding completion persistence is still to be implemented if/when that optional flow is built.
- An admin can connect a repository later from workspace settings/integrations.
- A repository connection failure does not prevent the user from using policies.
- Do not display review queue as a broken/empty core dashboard for a policy-only workspace; surface review features only when a repository is connected or offer them as an optional setup card.
- Workspace admin/member permissions govern who sees connection actions; workspace roles and member management are implemented in code/mock mode, with production deployment pending.
- Provider secrets stay server-side; the browser only receives connection status and safe repository metadata.

## Suggested onboarding states

`new workspace → welcome and choose path → (connect provider → select repositories → sync status → review workspace) OR (skip → policy workspace)`

Persist onboarding completion separately from policy and repository records, for example `onboarding_completed_at` and `review_setup_state` on a workspace record. Avoid using a client-only localStorage flag as the production source of truth.

## Decisions before implementation

- Should setup be a dedicated page, a first-run dialog, or an optional dashboard card? Suggested: dedicated page only for new workspaces; provide a smaller dismissible “Connect a repository” card on the dashboard later.
- Should repo connection be available to all admins or only the workspace owner? Suggested: any admin, enforced by backend/RLS.
- Can users connect repositories later, disconnect them, or choose a subset? Suggested: all three.
- How should users create an initial policy? Suggested: offer both a blank policy and the existing AI-assisted draft flow on the policy-only first-run path.
