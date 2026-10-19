# Policy Desk monorepo

This repository contains the Policy Desk web client and its Supabase backend.

## Structure

- [`apps/client`](apps/client) — React 19, TypeScript, Vite application. Its mock and Supabase data adapters share the same domain interfaces.
- [`apps/backend/supabase`](apps/backend/supabase) — Supabase schema, versioned migrations, Edge Functions, and local CLI configuration.
- [`docs`](docs) — setup and feature planning notes.

## Start the client

```sh
pnpm install
pnpm dev
```

Configure the client in `apps/client/.env` using [`apps/client/.env.example`](apps/client/.env.example). With no Supabase credentials, the client falls back to mock mode; you can explicitly select it with `VITE_DATA_MODE=mock`.

## Common commands

- `pnpm dev` — run the client dev server.
- `pnpm lint` — lint the client.
- `pnpm build` — type-check and build the client.
- `pnpm --filter @policydesk/backend supabase status` — inspect the local Supabase CLI project.
- `pnpm --filter @policydesk/backend db:push` — apply pending Supabase migrations (review the target before running).
- `pnpm --filter @policydesk/backend functions:deploy:members -- --project-ref <project-ref>` — deploy the workspace membership function.

For production setup and migration safety, see [`docs/supabase-setup.md`](docs/supabase-setup.md).
