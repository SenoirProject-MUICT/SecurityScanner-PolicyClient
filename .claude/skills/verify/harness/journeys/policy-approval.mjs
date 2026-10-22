// New user → new workspace (sole admin) → create policy → submit → self-approve.
// Proves the UI end state and the rows written in public.policies / public.policy_approval_events.
import { assert, createWorkspace, runJourney, signUp, sql, uniqueUser } from '../lib.mjs'

await runJourney('policy-approval', async ({ page, shot, record }) => {
  const user = uniqueUser('approval')
  await signUp(page, user)
  await shot('signed-up-workspace-setup')

  const workspaceId = await createWorkspace(page, `Verify workspace ${user.name}`)
  await shot('workspace-overview')

  await page.goto(`/${workspaceId}/policies`)
  await page.getByRole('button', { name: 'New policy' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Create a policy' })
  const policyName = `Verify secrets policy ${Date.now()}`
  await dialog.getByLabel('Policy name').fill(policyName)
  await dialog.getByLabel(/Summary/).fill('Created by the verify skill.')
  await shot('policy-editor-filled')
  await dialog.getByRole('button', { name: 'Submit for approval' }).click()

  await page.waitForURL(/\/policies\/[0-9a-f-]{36}$/)
  const policyId = page.url().split('/').pop()
  await page.getByRole('heading', { name: 'Waiting for approval' }).waitFor()
  await page.getByText('You’re the only admin, so you can approve your own submission.').waitFor()
  await shot('policy-pending')

  await page.getByRole('button', { name: 'Approve' }).click()
  const approveDialog = page.getByRole('dialog', { name: 'Approve this policy' })
  await approveDialog.getByLabel(/Approval note/).fill('Approved by verify.')
  await approveDialog.getByRole('button', { name: 'Approve', exact: true }).click()
  await page.getByRole('heading', { name: 'Approved', exact: true }).waitFor()
  await shot('policy-approved')

  const policyRow = sql(`select status, version, name from public.policies where id = '${policyId}' and workspace_id = '${workspaceId}'`)
  const events = sql(`select action, self_approved, note from public.policy_approval_events where policy_id = '${policyId}' order by occurred_at`)
  record('db.txt', `policies:\n${policyRow}\n\npolicy_approval_events:\n${events}\n`)

  assert(policyRow.startsWith('active\t'), `policy status should be active after approval, got: ${policyRow}`)
  assert(policyRow.endsWith(`\t${policyName}`), 'policy row should carry the name typed in the UI')
  const actions = events.split('\n').map((line) => line.split('\t'))
  assert(actions.length === 2 && actions[0][0] === 'submitted' && actions[1][0] === 'approved', `expected submitted then approved, got: ${events}`)
  assert(actions[1][1] === 't', 'sole-admin approval should be recorded as self_approved')
  assert(actions[1][2] === 'Approved by verify.', 'approval note should be saved')
})
