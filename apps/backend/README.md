# Policy Desk backend

The backend workspace contains two services with distinct responsibilities:

- `src/policydesk_api` is the FastAPI application. It handles authentication, policies, labels, workspace membership, and GitHub repository integration over versioned HTTP routes.
- `supabase` owns Postgres, schema migrations, Auth, and RLS policies. FastAPI is the only application service that talks to Supabase. It verifies user access tokens, uses the user's JWT for policy and label operations protected by RLS, and uses the service role for workspace membership workflows. Workspace scoped admin actions also verify active membership and the admin role first.

## FastAPI layout

```text
src/policydesk_api/
  api/v1/          HTTP routers grouped by API version
  core/            Settings and cross-cutting application infrastructure
  schemas/         Request and response contracts
  services/        Business workflows and orchestration
  repositories/    Data access boundaries
  integrations/    External systems such as GitHub, GitLab, and AI providers
  jobs/            Scheduled entry points such as repository reconciliation
  main.py          FastAPI app construction and middleware
```

Keep route handlers thin: validate HTTP input and delegate to a service. Policy and label services use repositories for persistence; the workspace membership service coordinates its multi-step Auth and database operations. Integrations wrap external APIs. Add feature modules as workflows are implemented rather than putting business logic in route handlers. Do not mirror Supabase tables as a second schema or move existing Postgres rules into the API without a feature requirement.

## Local development

Install Python 3.12 or newer, then run from the repository root:

```sh
pnpm install:all
pnpm dev:all
```

The install command creates `apps/backend/.venv` and installs the API with pip. You can also use `uv sync --project apps/backend` if you prefer uv.

The API is available at `http://127.0.0.1:8000`; interactive docs are at `/docs`. Configure optional settings in `apps/backend/.env` based on `.env.example`. CORS defaults to the Vite development origin.

The client only needs `VITE_API_BASE_URL`; it does not need Supabase credentials. Set `POLICYDESK_CORS_ORIGINS` to a JSON array for multiple allowed origins, for example `["http://localhost:5173","https://app.example.com"]`. Never place the service role key in the client environment.

Workspace join codes are hashed for validation and encrypted for workspace-admin reveal. Set `POLICYDESK_JOIN_CODE_ENCRYPTION_KEY` to a stable random secret in each backend environment; if omitted, the service role key is used to derive the encryption key. Keep this secret stable so previously created codes can still be revealed. Apply the `20261020000000_workspace_join_code_recovery.sql` migration before using code reveal in an existing database. Codes created before the migration cannot be recovered because only their hashes were stored.

## API routes

- `/api/v1/auth/*` — proxies sign-in, sign-up, refresh, sign-out, current user, and profile updates to Supabase Auth.
- `/api/v1/policies` and `/api/v1/policies/activity` — policy records and activity history.
- `/api/v1/policies/{id}/submit`, `/approve`, `/reject`, and `/history` — the admin approval workflow and its per-policy history. `PATCH /api/v1/policies/{id}/status` turns approved policies on or off and is limited to admins. Apply `20261021000000_policy_approval.sql` before using these routes.
- `/api/v1/labels` — workspace label CRUD and policy label propagation.
- `/api/v1/workspace-members` — membership, invitations, and expiring join-code actions.
- `GET /api/v1/integrations/github/install-url` — returns the GitHub App install URL with a signed, 10-minute `state`. Admins only.
- `GET /api/v1/integrations/github/callback` — GitHub App Callback URL. Links the installation to the workspace, starts the first sync, and redirects to `{POLICYDESK_APP_BASE_URL}/{workspaceId}/repositories?github=connected` or `?github=error&reason=<code>`.
- `POST /api/v1/integrations/github/webhook` — signed GitHub webhooks. Deliveries are deduplicated by `X-GitHub-Delivery` and processed after the response.
- `/api/v1/repository-connections` — list connections with every repository the installation can see and whether each is linked (members), `POST /{id}/sync` to sync now, `PUT /{id}/linked-repositories` with `{"repositoryIds": [...]}` to choose which repositories the workspace follows, and `DELETE /{id}` to disconnect (admins). Unlinking a repository deletes its imported pull requests. Disconnecting removes Policy Desk's copy only; uninstall the app on GitHub to revoke its access.
- `/api/v1/review-requests` and `/api/v1/review-requests/{id}` — imported pull requests and their changed files. `state` defaults to `open`; pass `all` for every state.

The workspace route currently accepts the existing action payload so the UI migration stays small. New API resources should use explicit HTTP operations and resource paths.

## GitHub repository integration

Apply `20261022000000_repository_integrations.sql` and `20261023000000_repository_linking.sql` before using the routes above. The API mirrors whichever repositories the GitHub App installation can see. Repositories picked while installing are linked; ones the App gains access to later wait unlinked until an admin adds them from **Repositories > Add repositories**. The API imports open pull requests with changed files and patches for linked repositories only, and keeps them current through webhooks and scheduled reconciliation.

To create the GitHub App:

1. In GitHub, open **Settings > Developer settings > GitHub Apps > New GitHub App**. Create it under the organization if it will be installed there.
2. Set **Callback URL** to `{API}/api/v1/integrations/github/callback`, where `{API}` is the public base URL of this API.
3. Select **Request user authorization (OAuth) during installation**. GitHub then sends users to the Callback URL after installing (the Setup URL is not used), and the callback uses the resulting code to confirm that the installing user can access the installation.
4. Set **Webhook URL** to `{API}/api/v1/integrations/github/webhook` and enter a random **Webhook secret**.
5. Under **Repository permissions**, grant **Metadata: Read-only** and **Pull requests: Read-only**.
6. Under **Subscribe to events**, select **Pull request**. Installation and installation repositories events are delivered to every GitHub App.
7. Generate a private key and a client secret.

Then set these backend settings:

- `POLICYDESK_GITHUB_APP_ID` is the numeric App ID.
- `POLICYDESK_GITHUB_APP_SLUG` is the app's URL name from `https://github.com/apps/<slug>`.
- `POLICYDESK_GITHUB_APP_CLIENT_ID` and `POLICYDESK_GITHUB_APP_CLIENT_SECRET` are the app's OAuth credentials. The client secret also signs the install `state`.
- `POLICYDESK_GITHUB_APP_PRIVATE_KEY` is the downloaded PEM. A single line with literal `\n` separators is accepted.
- `POLICYDESK_GITHUB_WEBHOOK_SECRET` is the webhook secret from step 4.
- `POLICYDESK_GITHUB_API_URL` defaults to `https://api.github.com`. Change it only for GitHub Enterprise Server.

Webhooks can be missed, so schedule reconciliation. It re-syncs every active connection and exits with status 1 if any connection failed. Run it hourly, for example with cron from `apps/backend`:

```sh
0 * * * * cd /path/to/apps/backend && PYTHONPATH=src .venv/bin/python -m policydesk_api.jobs.reconcile_repositories
```
