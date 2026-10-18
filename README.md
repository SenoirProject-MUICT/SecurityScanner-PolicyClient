# Policy Desk

A small React client for managing policies and reusable labels. It supports local mock data and an optional Supabase data source.

## Run locally

```sh
pnpm install
pnpm dev
```

If `VITE_DATA_MODE` is omitted, the app requests production mode. Production mode requires both Supabase credentials; if either is missing, it falls back to mock mode. Set `VITE_DATA_MODE=mock` to explicitly use local sample data and browser storage.

## Connect Supabase

The root `.env` file is present with empty URL and key values. It is ignored by Git. Copy the variable names from `.env.example` if needed, then fill in your Supabase project URL and **publishable** key:

```env
VITE_DATA_MODE=production
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Restart the Vite dev server after changing `.env`. The app resolves `VITE_DATA_MODE` to the `RuntimeMode` enum and exposes the resolved `isProd` value through the Zustand runtime-mode store. Production mode requires both Supabase values; without them, the app safely falls back to mock mode. The legacy value `supabase` remains accepted. If the credentials are present but a database request fails, the app surfaces that error instead of silently switching data sources.

The proposed schema in [`supabase/schema.sql`](supabase/schema.sql) defines the `public.policies` and `public.policy_labels` tables with owner-scoped Row Level Security. Review it against your project's existing schema before applying it. Existing installations may retain a legacy `skills` column; the client no longer reads or writes that column. Do not put a Supabase secret or service-role key in a `VITE_` variable.

Mock and Supabase data are separate. Switching modes does not copy records between local storage and the database.

## Labels

Create labels on the Labels page. Policies can only select labels that already exist in the workspace. Policy records store selected label names in a `labels` text array.

## Add shadcn/ui components

The project uses Tailwind CSS v4 and shadcn/ui. Add components with:

```sh
pnpm exec shadcn add input
```

## Commands

- `pnpm dev` starts the development server.
- `pnpm build` runs TypeScript checks and creates a production build.
- `pnpm lint` runs ESLint.
