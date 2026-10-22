# Labels

Workspace members create, rename and remove labels on the **Labels** page, and attach them to policies from the policy editor. Renaming or removing a label updates every policy that carries it.

## Sub-features

- `label-create` creates a label (2–32 chars).
- `label-rename` edits a label's name, and policies using it show the new name.
- `label-remove` removes a label from the workspace and from its policies.
- `label-attach` picks labels in the policy editor's **Choose labels** dialog.

## How to get to it (user POV)

- Sidebar **Labels** (`/<workspaceId>/labels`).
- Policy editor → **Labels** field → the label picker. The gear button `Manage labels` jumps to the Labels page.

## Driving it with playwright-core

No journey yet; these steps have not been executed.

Preconditions:

- `DOCTOR OK`, a fresh user and workspace.

- **Create.** On `/labels`, fill `getByLabel('Label name')` (placeholder `e.g. Security`) and click `Create label`. Toast `Label created`, and the label appears in the list.
- **Attach.** In `Create a policy`, click the labels trigger (`aria-haspopup="dialog"`, text `None yet`). Dialog `Choose labels` opens; type in `Search labels`, select the option, and click `Done`. The chip shows in the field.
- **Rename.** Open the label's actions and choose edit. Dialog `Edit label` → `Label name` → save. Toast `Label updated`.
- **Remove.** Dialog `Remove “<name>”` → `Remove label`. Toast `Label removed`.
- **Proof.** `sql("select name from public.policy_labels where workspace_id = '<id>'")`, plus the label chips on the policy detail page's **Labels** section.

## Gotchas

- The Labels page has its own `Search labels` input, and so does the policies filter. Scope selectors to the dialog or section.
- The label picker filters as you type. An empty workspace shows `No labels yet. Use the settings button to create one.`
