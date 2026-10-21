# Review platform roadmap

## Current status

This is a proposed extension of Policy Desk, not shipped functionality. Checked against the repository on 2026-10-18.

For Jira-ready ticket blocks with statuses, acceptance criteria, and dependencies, see [the feature backlog](jira-feature-backlog.md).

The app supports policy/label management, effective date scheduling, email/password auth, explicit workspace creation/joining, and admin/member management in application code and mock mode. Production workspace setup requires manually deploying its Supabase migrations and Edge Function. MR reviewer assignment, GitHub/GitLab connections, MR ingestion, vulnerability review labels, repository onboarding, and policy approval states are not implemented. The current schedule is for policy effective dates, and policy labels are general organization labels.

## Feature plans

| Order | Plan | Current state | Depends on |
| --- | --- | --- | --- |
| 1 | [Workspace roles and member management](review-platform-roles-plan.md) | Done in code/mock; production deployment pending | Foundation for all admin/member permissions |
| 2 | [GitHub/GitLab repository integration](repository-integration-plan.md) | GitHub implemented in code and mock mode; production setup and GitLab pending | Workspace roles and secure provider credential storage |
| 3 | [MR skill findings and vulnerability classifications](mr-skill-review-plan.md) | Not implemented | Repository/MR ingestion and Skill Detection service |
| 4 | [Review queue and adjustable review time](review-queue-plan.md) | Not implemented | Members, imported MRs, findings, and reviewer assignments |
| 5 | [Policy approval workflow](policy-approval-plan.md) | Not implemented | Admin role and policy lifecycle/schema changes |

Workspace setup (create or join) is implemented. The optional repository setup path is still a proposal in [first-entry-user-story.md](first-entry-user-story.md).

Workspace role-based access control is the completed foundation. “Reviewer” remains an assignment on a merge request, not a permanent workspace role. An active member may be assigned an MR; that assignment grants review permissions on that item, while admins can manage assignments and override reviews.

## Shared implementation requirements

- Keep provider credentials out of browser code. Use a trusted backend/edge function or encrypted server-side store.
- Enforce authorization in Supabase RLS/server-side code. Hiding a button in React is not an authorization boundary.
- Keep MR due times separate from policy effective dates and keep vulnerability classifications separate from policy organization labels.
- Add mock behavior alongside production persistence when a feature is introduced. Update the schema and RLS as part of persisted feature work.
- Keep enough finding provenance for future dataset curation (commit SHA, analyzer/model version, taxonomy version, reviewer, and timestamp). Recording feedback does not itself fine-tune a model.

See the [main project context](skill-detection-project.md) for current architecture, features, environment variables, and mock/production mode behavior.
