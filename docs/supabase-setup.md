# Set up Supabase for PolicyDesk

This guide prepares a Supabase project for production mode: database migrations, the workspace member Edge Function, Auth settings, and the browser's public connection values. The GitHub database workflow is disabled; this setup is run manually by the project operator.

## Before you start

- Create a Supabase project and install the [Supabase CLI](https://supabase.com/docs/guides/cli).
- Sign in to the CLI with `supabase login`.
- Find the project reference in the Supabase URL. For `https://suiqchyqbzgtvptdaqkf.supabase.co`, the reference is `suiqchyqbzgtvptdaqkf`.
- Configure the Supabase Auth Email provider. Under **Authentication → URL Configuration**, set the app's Site URL and add its login/callback URLs to the allowed redirect URLs.

Never put a Supabase secret/service-role key in `.env` or any `VITE_` variable. The browser uses only the project URL and publishable key; the Edge Function receives its server credentials from Supabase.

## Run the setup script

From the repository root in PowerShell:

```powershell
./scripts/setup-supabase.ps1 -ProjectRef "suiqchyqbzgtvptdaqkf" -AppBaseUrl "https://your-policydesk-app.example"
```

The script links the CLI to the selected project, prints migration history, and runs `supabase db push --dry-run` from `apps/backend`. It pauses before applying any pending migrations; type `APPLY` only after reviewing the preview and confirming it targets the intended project. If you decline, it skips both database changes and function deployment.

The first migration is a schema baseline. If this Supabase database was already changed manually or its migration history is out of sync, stop at the preview and reconcile the migration history before applying it. Do not apply `apps/backend/supabase/schema.sql` and the migrations as separate setup paths.

When confirmed, the script applies pending migrations and deploys `workspace-members`. `APP_BASE_URL` is optional, but recommended for new-user invitation links. Its URL must also be in the Supabase Auth allowed redirect URLs.

You can deploy only the Edge Function after the database has been migrated:

```powershell
supabase --workdir apps/backend functions deploy workspace-members --project-ref "suiqchyqbzgtvptdaqkf"
```

## Configure the web app

Copy the URL and publishable key from **Project Settings → API Keys** into the ignored `apps/client/.env` file:

```env
VITE_DATA_MODE=production
VITE_SUPABASE_URL=https://suiqchyqbzgtvptdaqkf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Restart Vite after editing `.env`. Sign in and open **Team**. The workspace membership setup should load; an admin can invite a member there. If the browser reports a 404 for `/functions/v1/workspace-members`, check that the function was deployed to the same project reference as `VITE_SUPABASE_URL`.

## Local mock mode

To use the app without a Supabase project, set `VITE_DATA_MODE=mock` in `apps/client/.env`. Workspace membership actions then use local browser storage; Supabase migrations and functions are not needed.
