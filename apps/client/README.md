# Policy Desk

A small React client for managing policies and reusable labels. It supports local mock data and an optional Supabase data source.

## Run locally

```sh
pnpm install
pnpm dev
```

If `VITE_DATA_MODE` is omitted, the app requests production mode. Production mode requires both Supabase credentials; if either is missing, it falls back to mock mode. Set `VITE_DATA_MODE=mock` to explicitly use local sample data and browser storage.

## Connect Supabase

Create an ignored `.env` file in `apps/client/`. Copy the variable names from [`.env.example`](.env.example), then fill in your Supabase project URL and **publishable** key:

```env
VITE_DATA_MODE=production
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Restart the Vite dev server after changing `.env`. The app resolves `VITE_DATA_MODE` to the `RuntimeMode` enum and exposes the resolved `isProd` value through the Zustand runtime-mode store. Production mode requires both Supabase values; without them, the app safely falls back to mock mode. The legacy value `supabase` remains accepted. If the credentials are present but a database request fails, the app surfaces that error instead of silently switching data sources.

The database baseline is in [`apps/backend/supabase/schema.sql`](../../apps/backend/supabase/schema.sql), with deployable, versioned SQL in [`apps/backend/supabase/migrations`](../../apps/backend/supabase/migrations). Create future database changes as a new migration; do not edit the production database directly. Existing installations may retain a legacy `skills` column; the client no longer reads or writes that column. Do not put a Supabase secret or service-role key in a `VITE_` variable.

For the complete manual setup of database migrations, Auth redirects, the `workspace-members` Edge Function, and web app environment values, see [Supabase setup](../../docs/supabase-setup.md). The PowerShell setup script previews migrations and requires typing `APPLY` before changing the remote database.

### Automate Supabase migrations

The `Database schema` GitHub Actions workflow is currently disabled: both jobs are gated off, including when the workflow is manually dispatched. When ready, remove the `if: false` gates to enable PR labeling and manual production deployment.

Configure these values in the GitHub repository's **production** environment:

- Secret `SUPABASE_ACCESS_TOKEN`: a Supabase personal access token for CLI authentication.
- Secret `SUPABASE_DB_PASSWORD`: the project's database password.
- Variable `SUPABASE_PROJECT_ID`: the project reference from the Supabase project URL.

The first migration captures the current schema as a baseline. If the remote database was changed manually before migrations were introduced, reconcile its schema and migration history before running the deployment workflow.

Mock and Supabase data are separate. Switching modes does not copy records between local storage and the database.

### Keep Supabase database types in sync

The shared client is typed from [`src/libs/supabase/database.types.ts`](src/libs/supabase/database.types.ts), which currently matches the checked-in schema. After applying a migration, regenerate and commit the type file from the repository root:

```sh
supabase --workdir apps/backend gen types typescript --linked --schema public > apps/client/src/libs/supabase/database.types.ts
```

The CLI is not configured in this checkout, so the committed SQL schema was used as the source for the initial type snapshot.

## Labels

Policies are AI knowledge scoped to a workspace; the workspace ID is tenant/ownership metadata that lets members share the same policy library. Policy behavior such as drafting and approval stays in the application. Policies, labels, and activity history are filtered by the selected workspace, with Supabase RLS enforcing active membership boundaries. The `20261018020000_workspace_scope_ai_policies.sql` migration adds the workspace links and backfills existing records.

Create labels on the Labels page. Policies can only select labels that already exist in the workspace. Policy records store selected label names in a `labels` text array.

## Add shadcn/ui components

The project uses Tailwind CSS v4 and shadcn/ui. Add components with:

```sh
pnpm --filter @policydesk/client exec shadcn add input
```

## Commands

- `pnpm dev` starts the development server.
- `pnpm build` runs TypeScript checks and creates a production build.
- `pnpm lint` runs ESLint.
