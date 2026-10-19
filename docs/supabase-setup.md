# Configure the backend and Supabase

The browser talks only to the FastAPI service. FastAPI proxies authentication and handles policy, label, and workspace-member requests; Supabase stores the data and enforces tenant access with RLS. No Supabase credentials or Edge Functions are needed in the browser.

## Configure FastAPI

Copy `apps/backend/.env.example` to `apps/backend/.env` and fill in:

```env
POLICYDESK_CORS_ORIGINS=["http://localhost:5173"]
POLICYDESK_SUPABASE_URL=https://your-project.supabase.co
POLICYDESK_SUPABASE_ANON_KEY=your-publishable-or-anon-key
POLICYDESK_SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
POLICYDESK_APP_BASE_URL=http://localhost:5173
```

Keep the service role key only in the backend environment. It bypasses RLS and is used for workspace membership operations after FastAPI verifies the user and checks their membership role.

Install Python 3.12 or newer and `uv`, then run from the repository root:

```powershell
uv sync --project apps/backend
pnpm --filter @policydesk/backend api:dev
```

The API starts at `http://localhost:8000`; its documentation is at `http://localhost:8000/docs`.

## Point the client at the API

Set `apps/client/.env`:

```env
VITE_DATA_MODE=production
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Restart Vite after editing the file. For sample data, set `VITE_DATA_MODE=mock`; mock mode runs entirely in the browser.

## Apply the Supabase schema

Install and authenticate the [Supabase CLI](https://supabase.com/docs/guides/cli), then run this from the repository root:

```powershell
./scripts/setup-supabase.ps1 -ProjectRef "your-project-ref"
```

The script links the selected project, displays migration history, and previews pending migrations. It asks you to type `APPLY` before applying them. Configure `POLICYDESK_APP_BASE_URL` in the backend environment and add that URL to Supabase Auth's allowed redirect URLs for invitation links.

The initial migration is a schema baseline. If migration history does not match the schema already in Supabase, stop and reconcile it before applying anything. Do not apply `apps/backend/supabase/schema.sql` and the migrations as separate setup paths.
