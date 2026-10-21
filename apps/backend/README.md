# Policy Desk backend

The backend workspace contains two services with distinct responsibilities:

- `src/policydesk_api` is the FastAPI application. It handles authentication, policies, labels, and workspace membership over versioned HTTP routes.
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

The workspace route currently accepts the existing action payload so the UI migration stays small. New API resources should use explicit HTTP operations and resource paths.
