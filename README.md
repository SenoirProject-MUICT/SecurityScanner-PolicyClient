# Policy Desk monorepo

This repository contains the Policy Desk web client, FastAPI backend, and Supabase database project.

## Structure

- [`apps/client`](apps/client) — React 19, TypeScript, Vite application. It uses TanStack Query for API caching and supports local mock mode.
- [`apps/backend/src/policydesk_api`](apps/backend/src/policydesk_api) — FastAPI application and the only server-side application integration with Supabase.
- [`apps/backend/supabase`](apps/backend/supabase) — Supabase schema, versioned migrations, and local CLI configuration.
- [`docs`](docs) — setup and feature planning notes.

## Install and run

```sh
pnpm install:all
pnpm dev:all
```

`pnpm install:all` installs the JavaScript workspace packages, creates `apps/backend/.venv`, and installs the FastAPI dependencies with pip. It requires Python 3.12 or newer; `uv` is optional. `pnpm dev:all` starts the Vite client and FastAPI backend together. Configure `apps/backend/.env` from [`apps/backend/.env.example`](apps/backend/.env.example), and configure `apps/client/.env` from [`apps/client/.env.example`](apps/client/.env.example). Production API mode is the default; set `VITE_DATA_MODE=mock` to use local sample data.

## Common commands

- `pnpm dev` — run the client dev server.
- `pnpm dev:all` — run the client and FastAPI backend together.
- `pnpm install:all` — install frontend and backend dependencies.
- `pnpm lint` — lint the client.
- `pnpm build` — type-check and build the client.
- `pnpm --filter @policydesk/backend supabase status` — inspect the local Supabase CLI project.
- `pnpm --filter @policydesk/backend db:push` — apply pending Supabase migrations (review the target before running).
- `uv sync --project apps/backend` — optional alternative for installing FastAPI dependencies with uv.
- `pnpm --filter @policydesk/backend api:dev` — run the FastAPI development server.

For backend boundaries and local API setup, see [`apps/backend/README.md`](apps/backend/README.md). For production Supabase setup and migration safety, see [`docs/supabase-setup.md`](docs/supabase-setup.md).
