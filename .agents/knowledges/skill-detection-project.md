# Policy Desk project context

## Product purpose

Policy Desk is the web client for the Senior Project's Skill Detection system. The larger project detects whether a skill is covered by a policy; this repository provides the interface for people to create, organize, review, schedule, activate, deactivate, edit, and delete the policies that detection can use. Keep policy management and skill detection as related but distinct responsibilities. Do not assume the detection engine lives in this repo.

Project brief: [Senior Project in Notion](https://app.notion.com/p/Senior-Project-3f1e30e57cb38000b3b3c2c4224593ac?pvs=11). It may require the user's Notion access.

## Stack and architecture

- React 19 + TypeScript + Vite; package manager is pnpm.
- React Router v8 (`react-router`) owns routing and lazy-loads page modules.
- Zustand stores shared auth, policy, and label state.
- shadcn/ui components are in [src/components/ui](../../src/components/ui/button.tsx); styling uses Tailwind CSS v4 and [src/App.css](../../src/App.css) / [src/index.css](../../src/index.css).
- Recharts is wrapped with the shadcn chart primitives in [src/components/ui/chart.tsx](../../src/components/ui/chart.tsx).
- React Hook Form + Zod handle forms. Framer Motion is used for selected transitions. Day.js handles dashboard clock/date comparisons.
- Feature code is grouped by domain under `src/libs/<domain>`; for example, [the policies facade](../../src/libs/policies/index.ts) selects mock or Supabase behavior from its domain repository files.

Typical data flow:

`page/component → Zustand store → domain facade → mock or Supabase repository` (for example, [policy store](../../src/stores/policy-store.ts) → [policy facade](../../src/libs/policies/index.ts)).

Keep UI components independent of storage details. Add shared business operations to the domain library and expose them through the store; avoid calling Supabase directly in pages.

### Workspace scope for policy knowledge

Policies are reusable AI knowledge that the Skill Detection system can consult. A policy is not itself a business workflow or approval decision. `workspace_id` scopes policies, labels, and policy activity so active workspace members share the appropriate library; application code owns policy lifecycle and approval behavior. Supabase RLS uses active workspace membership as the data boundary. The migration that links existing policy data to workspaces is [20261018020000_workspace_scope_ai_policies.sql](../../supabase/migrations/20261018020000_workspace_scope_ai_policies.sql).

Workspace selection and membership state live in [src/stores/workspace-store.ts](../../src/stores/workspace-store.ts), backed by [the workspace service](../../src/libs/workspaces/index.ts). Policy and label stores read the selected workspace ID and pass it through their domain facades to the mock or Supabase repositories. In mock mode, policies and labels persist in browser `localStorage` and are partitioned by a deterministic mock workspace ID; in production, rows are selected and mutated by `workspace_id`, with RLS as the server-side boundary.

### Workspace creation, joining, and roles

**Implemented in application code and mock mode; production deployment is still an operator setup step.** After authentication, a user without a workspace is routed to [the workspace setup page](../../src/pages/workspace-setup/page.tsx), where they explicitly create a workspace or join using a time-limited code. Signup does not create a workspace automatically. Workspace state and selection are managed by [the workspace store](../../src/stores/workspace-store.ts); the [workspace service facade](../../src/libs/workspaces/index.ts) selects mock or Supabase behavior. Mock workspaces, members, invitations, and join codes persist in browser local storage. Production operations use the authenticated [workspace-members Edge Function](../../supabase/functions/workspace-members/index.ts), with schema in [supabase/schema.sql](../../supabase/schema.sql) and versioned migrations in [supabase/migrations](../../supabase/migrations). Apply migrations and deploy the function manually before production use.

Roles are `admin` and `member`; reviewer is an MR assignment, not a workspace role. Admins can invite/manage members and create/revoke join codes. Members do not have workspace administration permissions. The [Team page](../../src/pages/team/page.tsx) is the member-management UI. Relevant context and remaining production setup are documented in [the workspace roles plan](review-platform-roles-plan.md).

## Feature and file map

### Routing and app shell

- [src/main.tsx](../../src/main.tsx) bootstraps React.
- [src/app/router.tsx](../../src/app/router.tsx) defines routes, initializes auth, protects the workspace, and wraps lazy pages with loading/transition behavior.
- [src/components/app-shell.tsx](../../src/components/app-shell.tsx) contains the workspace header/nav, profile menu, sign-out, route transition, and footer connection status.
- [src/components/workspace-loading.tsx](../../src/components/workspace-loading.tsx) renders the workspace entry/loading screen.

Routes:

- `/login` — [src/pages/login/page.tsx](../../src/pages/login/page.tsx)
- `/` — overview dashboard, [src/pages/overview/page.tsx](../../src/pages/overview/page.tsx)
- `/policies` — searchable/filterable policy library and view switcher, [src/pages/policies/page.tsx](../../src/pages/policies/page.tsx)
- `/policies/:policyId` — policy details, [src/pages/policy-detail/page.tsx](../../src/pages/policy-detail/page.tsx)
- `/labels` — create, edit, browse, and remove reusable labels, [src/pages/labels/page.tsx](../../src/pages/labels/page.tsx)
- `/assistant` — prompt-based policy draft flow, [src/pages/assistant/page.tsx](../../src/pages/assistant/page.tsx)
- `/settings` — account and connection settings, [src/pages/settings/page.tsx](../../src/pages/settings/page.tsx)
- `/team` — workspace members, roles, invitations, and join-code management, [src/pages/team/page.tsx](../../src/pages/team/page.tsx)
- Workspace setup — explicit create-or-join flow for authenticated users without a selected workspace, [src/pages/workspace-setup/page.tsx](../../src/pages/workspace-setup/page.tsx)

### Policies

- Domain facade: [src/libs/policies/index.ts](../../src/libs/policies/index.ts); types: [src/libs/policies/types.ts](../../src/libs/policies/types.ts); lifecycle helpers: [src/libs/policies/status.ts](../../src/libs/policies/status.ts).
- Repository implementations: [src/libs/policies/mock.ts](../../src/libs/policies/mock.ts) and [src/libs/policies/supabase.ts](../../src/libs/policies/supabase.ts).
- Shared state and mutation orchestration: [src/stores/policy-store.ts](../../src/stores/policy-store.ts).
- Create/edit form: [src/components/policy-editor-dialog.tsx](../../src/components/policy-editor-dialog.tsx).
- Detail layout: [src/components/policy-detail.tsx](../../src/components/policy-detail.tsx).
- Lifecycle logic: `getPolicyLifecycle` and `isPolicyEffective` in [src/libs/policies/status.ts](../../src/libs/policies/status.ts). Persisted statuses are `draft`, `active`, and `inactive`; an active policy with a future start date is presented as scheduled, and an expired policy is presented as inactive.
- Policies have name, description, labels, status, effective start/end dates, owner, creator, and timestamps. There is no “skills covered” field in this client schema.

### Labels

- Domain facade: [src/libs/labels/index.ts](../../src/libs/labels/index.ts); repositories: [src/libs/labels/mock.ts](../../src/libs/labels/mock.ts) and [src/libs/labels/supabase.ts](../../src/libs/labels/supabase.ts); types: [src/libs/labels/types.ts](../../src/libs/labels/types.ts).
- Shared state: [src/stores/label-store.ts](../../src/stores/label-store.ts).
- Badge: [src/components/policy-label-badge.tsx](../../src/components/policy-label-badge.tsx).
- Labels are managed separately and selected from existing labels in policy forms. Policy rows store label names in a text array. Renaming/removing labels updates policies using those labels in the repository implementations.

### Dashboard, schedule, charts, and search

- Overview metrics, recent changes, activity chart, current-status chart: [src/pages/overview/page.tsx](../../src/pages/overview/page.tsx).
- Month-view policy schedule and selected-policy detail panel: [src/components/policy-schedule.tsx](../../src/components/policy-schedule.tsx).
- Global search dialog and trigger: [src/components/policy-search.tsx](../../src/components/policy-search.tsx) and [src/components/policy-search-dialog.tsx](../../src/components/policy-search-dialog.tsx).
- Chart building blocks: [src/components/ui/chart.tsx](../../src/components/ui/chart.tsx).
- Activity event types are `added`, `removed`, `draft`, and `scheduled`. Mock activity persists locally; production activity is stored in `public.policy_activity` (see schema below). Historical total-policy points are reconstructed from current policy count and recorded add/remove events.

### Assistant

- UI: [src/components/policy-assistant.tsx](../../src/components/policy-assistant.tsx) and [src/pages/assistant/page.tsx](../../src/pages/assistant/page.tsx).
- Domain facade: [src/libs/policy-assistant/index.ts](../../src/libs/policy-assistant/index.ts).
- Current implementation: [src/libs/policy-assistant/mock.ts](../../src/libs/policy-assistant/mock.ts) (`generateMockPolicy`) creates a deterministic draft from prompt text and a few known topic matches. It is not connected to an LLM or Supabase AI service. Do not describe it as live AI generation unless a real provider is integrated.

### Authentication

- Types and mode selection: [src/libs/auth/index.ts](../../src/libs/auth/index.ts) and [src/libs/auth/types.ts](../../src/libs/auth/types.ts).
- Mock auth: [src/libs/auth/mock.ts](../../src/libs/auth/mock.ts).
- Supabase auth: [src/libs/auth/supabase.ts](../../src/libs/auth/supabase.ts).
- Zustand state: [src/stores/auth-store.ts](../../src/stores/auth-store.ts).
- Auth mode follows the same mode/configuration gate as policies, labels, and Supabase data.

## Mock mode

Mock mode is selected explicitly with `VITE_DATA_MODE=mock` and is also the fallback when production mode is requested without both required credentials. If `VITE_DATA_MODE` is omitted, production is requested. Mock mode uses the browser's `localStorage`; data is local to that browser and is not synchronized to Supabase or other devices. The mock repositories simulate about 500 ms loading latency using [src/libs/mock-delay.ts](../../src/libs/mock-delay.ts).

Storage keys currently used:

- `policy-desk.mock-auth.v1` — mock signed-in user
- `policy-desk.policies.v2` — policy rows (legacy `policy-desk.policies.v1` can be read during migration)
- `policy-desk.labels.v1` — reusable labels
- `policy-desk.activity.v1` — activity chart history

Mock auth accepts a non-empty email and a password of at least six characters at the service layer (the UI form requires at least eight). Any valid email can sign in; the demo account is `alex@policydesk.demo`. Mock assistant output is template/rule-based. To reset mock state, sign out and clear the keys above in the browser's local storage.

## Supabase / production mode

Mode is resolved by [src/libs/runtime-mode.ts](../../src/libs/runtime-mode.ts) into the `RuntimeMode` enum and held in [src/stores/runtime-mode-store.ts](../../src/stores/runtime-mode-store.ts). UI components subscribe to its `isProd` value; domain facades read the same Zustand state when selecting mock or Supabase adapters. `VITE_DATA_MODE=production` (legacy `supabase` is also accepted) activates Supabase only if both URL and publishable key are non-empty; otherwise it falls back to mock.

Provide these values in a local, ignored `.env` file (restart Vite after changes):

```env
VITE_DATA_MODE=production
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
```

`VITE_SUPABASE_PUBLISHABLE_KEY` is browser-visible by design. Never place a service-role or other secret key in a `VITE_` variable. Use the empty [`.env.example`](../../.env.example) as the template.

Before using production mode:

1. Create/configure the Supabase project and enable the desired Auth sign-in methods (the UI uses email/password).
2. Apply the workspace and policy migrations from [`supabase/migrations`](../../supabase/migrations), and deploy the `workspace-members` Edge Function. [`supabase/schema.sql`](../../supabase/schema.sql) is the schema reference; production authorization uses workspace membership RLS and the authenticated Edge Function for privileged membership operations.
3. Set the URL and publishable key above, then restart the Vite server.

If the credentials exist but database requests fail, the app should surface the real error rather than silently replacing production data with mock data. Mock and Supabase datasets remain separate; switching modes does not migrate or copy records.

## Planned review platform features

The proposed repository review, reviewer management, Git provider, vulnerability classification, and policy approval work is tracked separately in [review-platform-roadmap.md](review-platform-roadmap.md). That document identifies current implementation status, dependencies, suggested sequencing, and product decisions.

## Working conventions for agents

- Inspect existing domain types, repository interface, schema, and UI patterns before changing behavior. Keep mock and Supabase implementations aligned.
- Keep database reads/writes behind the domain library and Zustand store. Supabase RLS is part of the security boundary; workspace data must stay scoped to active membership.
- If adding a persisted feature, update both mock persistence and [`supabase/schema.sql`](../../supabase/schema.sql)/Supabase repository as appropriate.
- Keep env secrets out of source control and never put privileged Supabase credentials in browser code.
- Keep policy date/status behavior consistent with [src/libs/policies/status.ts](../../src/libs/policies/status.ts) and the schedule/dashboard/list views.
- Add shadcn components using the repository's configured shadcn setup; avoid ad hoc variants when the shared component already covers the need.

## Useful commands

- `pnpm dev` — start Vite.
- `pnpm build` — TypeScript project checks and production build.
- `pnpm lint` — ESLint.
- `pnpm exec shadcn add <component>` — add a configured shadcn component.
