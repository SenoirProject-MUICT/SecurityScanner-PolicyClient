# Repositories

Admins connect a GitHub App installation to the workspace. Policy Desk mirrors the installation's repositories and their open pull requests (with changed files and patches), keeps them current through webhooks and scheduled reconciliation, and lets members browse imported review requests.

## Sub-features

- `repo-connect` covers **Connect GitHub**, the GitHub App install, and the callback redirect back with `?github=connected`.
- `repo-sync` is **Sync now** on a connection.
- `repo-link` is **Add repositories** → the `Choose repositories` dialog, which links or unlinks the installation's repositories. Unlinking deletes that repository's imported pull requests.
- `repo-disconnect` is **Disconnect** → `Disconnect GitHub?`, which removes Policy Desk's copy only.
- `repo-browse` opens a repository and then a review request's changed files.

## How to get to it (user POV)

- Sidebar **Repositories** (`/<workspaceId>/repositories`).
- A repository row → `/<workspaceId>/repositories/<repositoryId>` → a pull request → `/<workspaceId>/repositories/<repositoryId>/<requestId>`.

## Driving it with playwright-core

No journey yet; these steps have not been executed. **This feature cannot be verified on the default verify stack.**

Preconditions (unmet by default):

- A GitHub App configured as in `apps/backend/README.md`, with its `POLICYDESK_GITHUB_*` settings exported before `up.sh`. `up.sh` does not set them.
- The App's Callback and Webhook URLs must reach the verify API at `:8100`, which needs a public tunnel.

- **Connect.** As an admin, click `Connect GitHub`. The browser goes to `github.com/apps/<slug>/installations/new`, then back to `/repositories?github=connected`. Toast `GitHub connected`.
- **Link.** Click `Add repositories`. In the `Choose repositories` dialog, check a repository and click `Link 1 repository`. Toast `Repositories updated`, and its card appears with `Syncing` until the import finishes. Unchecking a linked one shows the unlink warning and the button `Unlink 1 repository`. Mock mode offers two unlinked repositories (`docs-site`, `mobile-app`), so the picker UI can be driven without GitHub.
- **Sync.** Click `Sync now`. Toast `Sync complete`, or `Sync finished with errors`.
- **Disconnect.** Click `Disconnect` and confirm in `Disconnect GitHub?`. Toast `GitHub disconnected`.
- **Error path (runs without GitHub).** Visit `/<workspaceId>/repositories?github=error&reason=<code>`. Toast `Could not connect GitHub`.
- **Proof.** `sql("select status from public.repository_connections where workspace_id = '<id>'")`, `public.repositories` and `public.merge_requests` row counts.

## Gotchas

- Without GitHub settings, `GET /integrations/github/install-url` fails. Report `repo-connect` as unverified with that reason. Don't fake a connection with SQL inserts and call it verified.
- Webhook handling can be exercised without GitHub by POSTing a payload signed with `POLICYDESK_GITHUB_WEBHOOK_SECRET` to `/api/v1/integrations/github/webhook`. That is an API-level check, not a user journey, so label it as such.
