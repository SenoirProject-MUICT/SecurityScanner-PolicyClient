# Policy Desk

A small React client for managing policies and reusable labels. It supports local mock data and an optional Supabase data source.

## Run locally

```sh
pnpm install
pnpm dev
```

The app starts in mock mode by default. It stores policy and label records in this browser's local storage and includes sample policies and labels.

## Connect Supabase

The root `.env` file is present with empty URL and key values. It is ignored by Git. Copy the variable names from `.env.example` if needed, then fill in your Supabase project URL and **publishable** key:

```env
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Restart the Vite dev server after changing `.env`. The header reports the active data mode; the connection panel separately shows whether the URL and publishable key are present. If Supabase is selected without both values, the app falls back to mock mode. If the values are present but the database request fails, the app shows the Supabase error instead of silently switching data sources.

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
