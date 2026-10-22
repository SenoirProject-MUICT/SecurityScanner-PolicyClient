# Policy Desk verification map

This directory is the maintained source for verifying Policy Desk's user-facing behavior. Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- The stack is running from `.claude/skills/verify/scripts/up.sh`, and `doctor.sh` prints `DOCTOR OK`.
- The web app is at `http://127.0.0.1:5273` in `production` data mode. The API is at `http://127.0.0.1:8100/api/v1`. Supabase is the local Docker stack.
- There is no seed data. Each journey signs up its own user with `uniqueUser()` and creates its own workspace, so runs don't share state.
- Never drive an instance this run did not start.

## Driving conventions

- Journeys are `playwright-core` scripts in `harness/journeys/`, built on `harness/lib.mjs`. Run them from `harness/` with `node journeys/<name>.mjs`.
- Use ARIA roles and accessible names. Dialogs are found by their title, for example `getByRole('dialog', { name: 'Create a policy' })`.
- App routes are `/<workspaceId>/<page>`. Read the workspace id from the URL after `createWorkspace`.
- Read side effects with `sql()`. Never write state with it.

## Proof and skip reporting

- Capture the action and the resulting state with `shot()`, and the persisted side effect with `record('db.txt', …)`.
- `network.log` must show the API calls that the UI action caused.
- Report an unreachable path with the unmet precondition. Don't report it as verified through another path.

## Feature entry contract

Each feature file starts with an H1 and a paragraph about the user-visible behavior, then four H2s in order: `Sub-features`, `How to get to it (user POV)`, `Driving it with playwright-core`, `Gotchas`. A feature with a runnable journey names it. Steps without one are recipes whose handles were read from source but have not been executed yet.

## Features

- [Account and workspace setup](./account-and-workspace.md): sign up, sign in, create or join a workspace, the workspace picker. Covered by the shared helpers that `policy-approval.mjs` exercises.
- [Policy approval](./policy-approval.md): create a policy, submit it, approve or reject it, turn it on or off. **Journey: `policy-approval.mjs` (verified).**
- [Labels](./labels.md): create, rename and remove labels, and attach them to policies.
- [Team and join codes](./team-and-join-codes.md): invite members, create, reveal and revoke join codes, join with a code.
- [Repositories](./repositories.md): connect GitHub, sync, disconnect, browse imported pull requests. Needs a real GitHub App, so it can't be verified on the default stack.
