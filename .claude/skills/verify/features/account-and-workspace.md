# Account and workspace setup

A visitor creates an account or signs in, then either creates a workspace (becoming its admin) or joins one with a code. A user with workspaces picks one from **Choose a workspace** before entering the app.

## Sub-features

- `auth-sign-up` creates an account. Local Supabase has email confirmation off, so the user is signed in immediately.
- `auth-sign-in` signs in an existing account.
- `auth-sign-out` signs out from the user menu.
- `workspace-create` creates a workspace from setup or from the picker.
- `workspace-pick` enters a workspace from the picker.

## How to get to it (user POV)

- `/login` → **Create an account** / **Sign in**.
- With no workspaces: the setup screen **Where should we take you?** → **Create a workspace** / **Join with a code**.
- With workspaces: **Choose a workspace** → click a workspace card, or **Create workspace** / **Join with code** in its header.

## Driving it with playwright-core

Helpers: `signUp`, `signIn` and `createWorkspace` in `harness/lib.mjs`. `signUp` and `createWorkspace` run inside `policy-approval.mjs` (verified). `signIn` has not been executed yet.

Preconditions:

- `DOCTOR OK`. A fresh browser context (`runJourney` gives one).

- **Sign up.** At `/login` click `Create an account`, fill `Your name`, `Email address` and `Password` (min 8), then click `Create account`. Heading `Where should we take you?` shows. `network.log` has `POST 200 …/auth/sign-up`.
- **Create workspace.** Click the `Create a workspace` option, fill `Workspace name`, and click `Create workspace`. Heading `Choose a workspace` shows, with a card for the new workspace labelled `Admin`.
- **Enter it.** Click the card (`role=button`, filter by the workspace name). The URL becomes `/<uuid>` and the sidebar shows the workspace name.
- **Sign in.** At `/login` fill `Email address` and `Password` and click `Sign in`. The workspace picker or setup screen shows.
- **Proof.** `sql("select role, status from public.workspace_memberships where workspace_id = '<id>'")` gives one `admin` / `active` row.

## Gotchas

- Use `@example.com` emails. The API's `email-validator` rejects reserved TLDs like `.test` with a 422.
- Creating a workspace does **not** enter it. It lands on `Choose a workspace`, so the helper clicks the card.
- The session lives in `localStorage` key `policy-desk.api-auth.v1`. A reused context stays signed in, which is why `runJourney` uses a fresh context.
- `Continue as demo user` appears only in mock mode. It must not be visible on the verify stack, and if it is, the client is in mock mode.
