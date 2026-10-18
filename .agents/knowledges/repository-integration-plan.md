# Plan: GitHub and GitLab repository integration

## Status

Not implemented. There is no provider authorization flow, repository connection, webhook, pull request / MR persistence, changed-file persistence, or provider API client in this repository.

## Dependencies

- [Workspace roles and member management](review-platform-roles-plan.md), so repository connections and credentials can be administered safely.
- A trusted server-side/edge-function boundary for provider OAuth, token handling, webhook verification, and API requests. The current frontend is a Vite browser app and must not hold provider secrets.
- [Workspace roles and member management](review-platform-roles-plan.md) is implemented in application code and mock mode; its production migration and Edge Function deployment is still pending. Repository connections should be workspace-owned and restricted to admins; members can use the review queue.

## Goal and data flow

Allow an admin to connect one or more GitHub/GitLab repositories, import open review requests, and keep their state current. GitHub uses “pull request”; GitLab uses “merge request”. Normalize both to an internal review-request model while preserving provider, repository, provider request ID, URL, branch names, head/base commit SHAs, author, state, draft status, and timestamps. Store a normalized list of changed files for each request so reviewers can see what was added, removed, modified, or renamed.

Suggested flow:

`Admin installs/connects GitHub App → backend records installation and selected repositories → initial sync imports open PRs and their changed-file metadata → signed webhook updates PRs and files → periodic reconciliation repairs missed events → review queue displays the normalized requests and file changes`

## GitHub connection and sync design

Use a GitHub App installed on the selected organization/account and repositories. Ask only for repository metadata and pull request read access initially. The App installation is the durable connection; create short-lived installation access tokens on the backend when calling GitHub. Do not put the App private key, client secret, webhook secret, or installation token in `VITE_*` variables, browser storage, or frontend responses.

1. An admin chooses **Connect GitHub** in Integrations. The app sends them through GitHub's App installation flow and returns to a server callback.
2. The callback validates the state value, records the installation/account metadata for the workspace, and queues the first sync. Repository access can be selected at installation time or narrowed by an admin afterward.
3. The backend lists repositories visible to the installation, then fetches open pull requests for each connected repository. Handle pagination; upsert by `(provider, repository_id, provider_request_id)` so repeated syncs do not create duplicates.
4. For each PR, fetch its changed-file list from `GET /repos/{owner}/{repo}/pulls/{pull_number}/files`. Save filename, status, additions, deletions, total changes, previous filename for renames, and patch when GitHub returns one. Paginate this endpoint too. The REST API caps this endpoint at 3,000 files per PR; `patch` can be missing for binary, large, or otherwise unavailable diffs, so the UI must still show file name and counts and link to the provider PR.
5. A public Supabase Edge Function receives GitHub webhooks. Disable the Supabase JWT gate only for that webhook function, then verify GitHub's `X-Hub-Signature-256` HMAC against the raw request body using the webhook secret. Deduplicate with `X-GitHub-Delivery`. For relevant `pull_request` actions (opened, reopened, synchronize, closed, ready_for_review, converted_to_draft, edited), refresh the PR and changed-file rows from GitHub rather than trusting incomplete event payloads.
6. Schedule a periodic backend reconciliation to recover missed webhook deliveries and refresh open PRs. Record `last_synced_at`, sync status, and errors per repository; make retries bounded and safe.
7. Review queue detail displays changed-file summary counts and a list grouped by added / modified / removed / renamed. A reviewer can expand a file to see the returned patch when available, or open the PR on GitHub. Avoid fetching full source file contents for the first version.

GitHub REST references: [List pull requests](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests), [List pull request files](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files), [GitHub App installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation), [pull_request webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request). Supabase documents [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets) and [webhook authentication](https://supabase.com/docs/guides/functions/auth#external-webhooks).

## Proposed data model

- `repository_connections`: workspace ID, provider (`github` / `gitlab`), provider account ID/name, installation ID, connection status, connected-by user, timestamps. Keep secrets outside ordinary browser-readable rows; ideally store only the installation identifier and keep App signing secrets in Edge Function secrets.
- `repositories`: workspace ID, connection ID, provider repository ID, owner/name/full name, URL, default branch, private flag, sync status and timestamps. Unique key: `(provider, provider_repository_id)`.
- `merge_requests`: workspace ID, repository ID, provider request ID/number, title, description, URL, state, draft flag, author identity, source/target branch, head/base SHA, created/updated/closed timestamps, last synced timestamp. Unique key: `(provider, repository_id, provider_request_id)`.
- `merge_request_files`: merge request ID, provider file path, previous path for rename, status, additions, deletions, changes, patch (nullable), blob SHA (nullable). Unique key: `(merge_request_id, filename)`.
- `provider_webhook_deliveries`: provider delivery ID, event/action, received/processed timestamps and outcome for replay protection and debugging.

RLS should scope application-visible rows to the user's workspace. The webhook and sync functions must verify the workspace/repository mapping before privileged writes. Workspace membership and workspace-scoped policy schema are implemented in `supabase/schema.sql` and versioned migrations; deploy that foundation before repository tables. Provider credentials must never be readable through RLS.

## Files to add

- `supabase/migrations/<timestamp>_repository_integrations.sql` — the connection, repository, pull request, changed-file, and webhook-delivery tables, indexes, constraints, and RLS policies.
- `supabase/functions/github-app-callback/index.ts` — installation callback/state validation and connection registration.
- `supabase/functions/github-webhook/index.ts` — signature verification, delivery deduplication, action routing, and refresh enqueueing.
- `supabase/functions/github-sync/index.ts` — authenticated admin-triggered initial sync and scheduled reconciliation entry point.
- `supabase/functions/_shared/github.ts` — GitHub App JWT / installation-token helper, paginated REST client, and typed response mapping.
- `src/libs/repositories/types.ts` — provider-neutral repository, pull request, changed-file, and sync types.
- `src/libs/repositories/index.ts` — mock/Supabase facade following existing feature-library conventions.
- `src/libs/repositories/mock.ts` — local sample repositories, PRs, and file-change data, plus mock connect/sync/disconnect operations.
- `src/libs/repositories/supabase.ts` — browser-safe reads and authenticated Edge Function invocations; no GitHub API secret/token handling.
- `src/stores/repository-store.ts` — Zustand state for repositories, sync state, and review requests.
- `src/pages/integrations/page.tsx` — connect GitHub, show connected accounts/repos, sync status, and disconnect controls.
- `src/pages/review-queue/page.tsx` — list incoming requests with filters and assignment/readiness states.
- `src/pages/review-detail/page.tsx` — request summary and changed-file list/patch preview.
- `src/components/repository-connect-card.tsx` — provider connection affordance and connection state.
- `src/components/changed-files-list.tsx` — file status, additions/deletions, expandable patch, and GitHub link.
- `src/components/review-request-card.tsx` — reusable queue row/card.

## Existing files to change

- `src/app/router.tsx` — register `/integrations`, `/reviews`, and `/reviews/:requestId` routes using the existing per-page-folder lazy-loading convention.
- `src/components/app-shell.tsx` — add Integrations and Review Queue navigation entries, subject to RBAC.
- `src/pages/settings/page.tsx` — link to integration management or expose the connected provider state.
- `supabase/schema.sql` or the migration workflow — keep the canonical schema/migration strategy consistent. This repository currently has `supabase/schema.sql` but no migrations directory.
- `.env.example` and project setup documentation — retain only public `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser. Document `GITHUB_APP_ID`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, and `GITHUB_WEBHOOK_SECRET` as Supabase Edge Function secrets (local values in `supabase/functions/.env`, production via Supabase secrets configuration); never prefix them with `VITE_`.
- `.agents/knowledges/skill-detection-project.md` — update architecture, environment, and feature status once this plan is implemented.

## Initial UI behavior

- Integrations page clearly offers **Connect GitHub** as optional. Users can continue using the policy workspace without a connected repository.
- After connection, show selected repositories, last successful sync, and actionable errors. Provide a manual sync action for admins.
- Review Queue shows open PRs and request metadata. Each request shows changed-file counts; details list the files and additions/deletions, with a patch preview when available and a link to GitHub.
- Empty states distinguish “No repository connected” from “Connected, no open pull requests.”
- Mock mode uses the same facade and surfaces believable connected/disconnected states, sample PRs, and changed-file examples without GitHub credentials.

## Implementation sequence

1. Implement workspace/member roles and admin-only integration management.
2. Create/configure a GitHub App with repository metadata and pull request read permissions; use a test organization/repository first.
3. Add server-side callback, installation token generation, connection persistence, and disconnect handling.
4. Add tables/RLS and mock + Supabase library adapters.
5. Implement initial open-PR sync including paginated changed-file metadata.
6. Add signed webhooks, delivery deduplication, and periodic reconciliation.
7. Build Integrations, Review Queue, and review detail UI; show changed-file names/counts and optional patches.
8. Add GitLab through the same provider-neutral types and UI after GitHub works end to end.

## Decisions before implementation

- GitHub first or GitLab first? Suggested: GitHub first, then GitLab against the normalized adapter interface.
- Initial request scope: open requests only or historical requests too? Suggested: open requests only for the first version.
- Which repositories are selected at install time, and can admins add/remove repositories later? Suggested: installation-level access is narrowed to explicitly selected repositories.
- Where will the trusted callback/webhook/sync functions run? Supabase Edge Functions fit the current Supabase backend, but require deployment and secrets configuration.
- Should patch text be stored in the database or fetched on demand? Suggested: store returned patch text for simpler review display, allowing null when GitHub omits it; revisit storage/retention after usage is understood.
