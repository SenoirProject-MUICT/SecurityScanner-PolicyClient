# Plan: MR review queue and adjustable review time

## Status

Not implemented. The existing [policy schedule](../../apps/client/src/components/policy-schedule.tsx) displays policy effective date ranges; it is not a merge request review queue or review SLA tracker.

## Dependencies

- [Workspace roles and member management](review-platform-roles-plan.md) for members/admins and assignment permissions.
- [GitHub/GitLab integration](repository-integration-plan.md) for imported MRs and state changes.
- [MR skill findings](mr-skill-review-plan.md) to surface the skill/policy findings that need review.

## Goal

Give reviewers one place to see work requiring attention, due times, and completion state. Make review time configurable without confusing it with policy effective dates.

## Proposed queue

Show MR title and repository, author, linked skill findings, assigned member, review state, age, due time, and overdue/soon indicator. Include filters for assignment (mine/unassigned/all for admins), state, repository, vulnerability category, and due status. Support opening the provider MR and the internal finding/review detail.

## Adjustable review time

Suggested first version: workspace default review SLA, expressed in hours, plus an admin override on a specific MR. Save the resulting due timestamp on the review item when it is created/assigned; later SLA changes should not silently rewrite existing deadlines. Show due-soon and overdue states using the saved due timestamp.

## Implementation sequence

1. Define review states and assignment lifecycle (suggested: unassigned, assigned, in review, completed, dismissed).
2. Add due-time defaults and per-MR override, including what happens when the assignee changes.
3. Create queue view and filters from persisted MRs/findings/assignments.
4. Add reviewer actions and admin reassignment/override with audit history.
5. Add mock queue scenarios: empty, unassigned, due soon, overdue, completed, and long MR titles.

## Decisions before implementation

- Should SLA count wall-clock hours or business hours? Suggested first version: wall-clock hours, workspace timezone only for display.
- Is review time configured per workspace, per repository, or both? Suggested: workspace default plus per-MR override; add repo defaults only when needed.
- When does the SLA start: MR creation, first finding, or reviewer assignment? Suggested: reviewer assignment, with MR age also visible.
- What happens to deadline on re-assignment? Suggested: preserve existing due time unless admin changes it explicitly.
