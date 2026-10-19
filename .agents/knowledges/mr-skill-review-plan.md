# Plan: MR skill findings and vulnerability classifications

## Status

Not implemented. The client has no MR diff analyzer, skill finding model, vulnerability taxonomy, or reviewer feedback persistence. Existing policy labels are for organization only. The prompt assistant is deterministic mock generation, not the Skill Detection service or a live LLM.

References: [general policy label type](../../apps/client/src/libs/labels/types.ts), [mock assistant implementation](../../apps/client/src/libs/policy-assistant/mock.ts), [project context](skill-detection-project.md).

## Dependencies

- [Repository integration](repository-integration-plan.md) for normalized MR records, repository identity, and commit SHA.
- The separate Senior Project Skill Detection/analyzer service that can report which skills/policies need review. This repository does not contain that engine.
- [Workspace roles](review-platform-roles-plan.md) so only assigned members/admins can write reviewer feedback.

## Goal and workflow

For each imported MR, show skill-related findings from the detection service. Let an assigned member classify each finding with one or more vulnerability-type labels, add a disposition and optional note, and save an auditable review record. This feedback can later be curated into a training dataset; it does not automatically train/fine-tune a model.

## Suggested data model

- `skill_findings`: workspace, MR, repository, commit SHA, detected skill/policy, summary/details, detector/model version, status, timestamps.
- `vulnerability_categories`: workspace or global controlled taxonomy; category key, display name, description, active state, version.
- `finding_classifications`: finding, category, reviewer, optional note/disposition, created/updated timestamps.
- `review_history`: assignment and reviewer actions with timestamps for auditability.

Do not reuse the policy `labels` text array. Reviewer vulnerability labels need their own taxonomy, stable identifiers, and version history.

## Implementation sequence

1. Agree on the detection service contract and finding payload.
2. Define a controlled initial vulnerability taxonomy and whether categories are workspace-managed.
3. Add mock finding and classification data to build/test the UX independently of the analyzer.
4. Add production tables, constraints, RLS, repository functions, and UI for finding details/classifications.
5. Store reviewer identity, commit SHA, analyzer version, taxonomy version, and timestamps for every saved classification.
6. Export/curate data later through a separate reviewed pipeline; never treat raw labels as an automatically approved training corpus.

## Decisions before implementation

- Which vulnerability categories and hierarchy should be used?
- May one finding receive multiple categories? Suggested: yes.
- Do reviewers need dispositions such as confirmed, false positive, or needs more context?
- Who approves new taxonomy categories and edits to existing ones?
