---
name: verify
description: Drive the real Policy Desk (Zentra) web app — React client, FastAPI backend, local Supabase — in Chrome the way a user does, and capture proof (screenshots, API calls, DB rows). Use to prove a UI, API, or migration change works end to end, before calling such work done.
---

# Verify Policy Desk

The user-facing surface is the web client (`apps/client`, Vite + React). It talks only to the FastAPI API (`apps/backend/src/policydesk_api`), and the API is the only thing that talks to Supabase. A proof drives the browser, so all three layers run.

The stack this skill starts is isolated from the developer's:

| Piece | Verify instance | Developer default |
| --- | --- | --- |
| Web | `http://127.0.0.1:5273`, `VITE_DATA_MODE=production` | `:5173`, often `mock` |
| API | `http://127.0.0.1:8100/api/v1` | `:8000` |
| Supabase | local Docker stack `policies-client` at `http://127.0.0.1:54321` | hosted project in `apps/backend/.env` |

`up.sh` overrides every `POLICYDESK_*` setting with env vars, so `apps/backend/.env` (which points at the hosted project) is never used. Never drive the developer's `:5173`/`:8000` servers, and never run journeys against the hosted Supabase. Mock mode (`VITE_DATA_MODE=mock`) bypasses the API entirely, so it proves nothing about backend or database changes.

All paths below are relative to the repo root.

## Launch

Needs Docker running, `supabase` CLI, Google Chrome, and `pnpm install:all` done once (creates `apps/backend/.venv` and `apps/client/node_modules`). Install the harness once:

```sh
npm install --prefix .claude/skills/verify/harness
```

Start the stack:

```sh
.claude/skills/verify/scripts/up.sh          # reuse local DB state
.claude/skills/verify/scripts/up.sh --reset  # wipe local DB and re-apply supabase/migrations
```

On an empty Docker data dir, `supabase start` applies every file in `apps/backend/supabase/migrations/`. There is no seed data, so every journey creates its own user and workspace. Ready is the line `READY api=… web=… supabase=…`. It prints only after Supabase Auth `/auth/v1/health` returns 200, the API returns 401 for `/auth/me`, and Vite serves `/login`. Override ports with `VERIFY_API_PORT` / `VERIFY_WEB_PORT`. The Supabase ports are fixed by `project_id`, so only one local Supabase for this project can run per machine.

After adding a migration, run `up.sh --reset` (or `supabase --workdir apps/backend migration up --local`) so the local DB matches. Doctor fails on a count mismatch.

## Doctor

Run this first, and again whenever anything looks off. It's read-only:

```sh
.claude/skills/verify/scripts/doctor.sh
```

It checks that the API and Vite processes from `up.sh` are alive and own their ports, local Supabase is up with the URL recorded at launch, applied migrations equal the files in `supabase/migrations/`, the API enforces auth, and the client is served in `production` mode pointed at the verify API (read from the env Vite inlines into the served module). Output `DOCTOR OK …` means drive. `DOCTOR FAIL: <reason>` means fix that first.

## Drive

Journeys are Node scripts on `playwright-core` driving system Chrome (`channel: 'chrome'`, headless; `VERIFY_HEADED=1` to watch):

```sh
cd .claude/skills/verify/harness && node journeys/policy-approval.mjs
```

Each run prints `PASS <journey> evidence=<dir>` or `FAIL … evidence=<dir>` with the stack trace, and exits non-zero on failure.

To write a new journey, copy `journeys/policy-approval.mjs` and use `harness/lib.mjs`:

- `runJourney(name, async ({ page, shot, record }) => …)` opens a fresh context (empty localStorage, so no stale session), and on failure saves a `failure` screenshot and the trace.
- `uniqueUser(prefix)`, `signUp(page, user)` and `createWorkspace(page, name)` give a fresh sole-admin user inside a fresh workspace. `createWorkspace` returns the workspace id. All app routes are `/<workspaceId>/<page>`.
- `sql(query)` runs read-only checks against the local DB (`docker exec supabase_db_policies-client psql`) for side-effect proof.
- `shot(name)` saves a numbered full-page screenshot and logs the step and URL.

Select by role and accessible name (`getByRole('button', { name: 'New policy' })`, `getByLabel('Policy name')`, `getByRole('dialog', { name: 'Approve this policy' })`), never by CSS class or position. The per-feature recipes, with exact handles, are in [features/README.md](features/README.md).

## Evidence

Each run writes `.verify/evidence/<ISO-time>-<journey>/` (gitignored):

- `NN-<step>.png`: one screenshot per step, so the action and the resulting state are both visible.
- `network.log`: every API call as `METHOD STATUS URL`, which shows the UI went through the real API.
- `console.log`: browser console messages and page errors.
- `db.txt`: the rows the journey read back with `sql()`.
- `trace.zip`: the Playwright trace; open it with `npx --prefix .claude/skills/verify/harness playwright-core show-trace <path>`, or at trace.playwright.dev.
- `RESULT`: `PASS`, or `FAIL` plus the stack.

Proof standards:

- Go through the user path: the login form, buttons, dialogs. Never seed state through the API or SQL to skip a step under test. `sql()` is for reading results.
- Pair each UI end state with its side effect: the DB row, the activity history entry, the API status in `network.log`.
- A toast alone is not proof. Assert the persisted state (reload, or read it back).
- Report a journey that cannot run, with the unmet precondition. Don't swap in an easier path and call the feature verified.

## Cleanup

```sh
.claude/skills/verify/scripts/down.sh
```

This kills only the PIDs `up.sh` recorded. It stops local Supabase with `--no-backup`, which drops the local verify data, but only if `up.sh` was the one that started it; otherwise it leaves Supabase running. Then it removes `.verify/run/`. `.verify/evidence/` is kept. Run cleanup after every failed attempt too.

## Helpers

| Script | Use |
| --- | --- |
| `scripts/up.sh [--reset]` | Start the isolated stack. State goes in `.verify/run/` (PIDs, `env`, `api.log`, `web.log`). |
| `scripts/doctor.sh` | Read-only health check of the recorded stack. |
| `scripts/down.sh` | Tear down what `up.sh` started and keep the evidence. |
| `harness/lib.mjs` | Journey helpers (see Drive). |
| `harness/journeys/*.mjs` | Runnable journeys. Run them from `harness/`. |

When a run fails, read `.verify/run/api.log` (FastAPI logs `Request rejected request_id=… status=…` with the reason) and the evidence `network.log` before changing anything.
