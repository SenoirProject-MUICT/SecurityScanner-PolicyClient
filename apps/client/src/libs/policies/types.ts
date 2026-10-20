export type Policy = {
  id: string
  workspaceId: string
  name: string
  description: string
  labels: string[]
  status: PolicyStatus
  effectiveFrom: string | null
  effectiveUntil: string | null
  ownerId: string
  createdBy: string
  createdAt: string
  updatedAt: string
  /** Increases whenever reviewed content changes, so each approval decision covers one version. */
  version: number
  submittedBy: string | null
  submittedAt: string | null
}

export type PolicyStatus = 'draft' | 'pending' | 'active' | 'inactive' | 'rejected'
/** Authors keep a draft or submit it; only an admin decision makes a policy active. */
export type PolicySubmitStatus = Extract<PolicyStatus, 'draft' | 'pending'>
/** Admins switch approved policies on and off. */
export type PolicyToggleStatus = Extract<PolicyStatus, 'active' | 'inactive'>
export type PolicyActivityType = 'added' | 'removed' | 'draft' | 'scheduled'
export type PolicyActivity = { id: string; workspaceId: string; policyId: string; policyName: string; type: PolicyActivityType; occurredAt: string }
export type PolicyApprovalAction = 'submitted' | 'approved' | 'rejected' | 'reopened' | 'deactivated' | 'reactivated'
export type PolicyApprovalEvent = {
  id: string
  workspaceId: string
  policyId: string
  policyName: string
  policyVersion: number
  action: PolicyApprovalAction
  actorId: string
  actorName: string
  note: string
  selfApproved: boolean
  occurredAt: string
}
export type PolicyFields = Pick<Policy, 'name' | 'description' | 'labels' | 'effectiveFrom' | 'effectiveUntil'> & { status: PolicySubmitStatus }
export type PolicyInput = PolicyFields & Pick<Policy, 'workspaceId' | 'ownerId' | 'createdBy'>
export type PolicyDraftInput = PolicyFields
export type PolicyRepository = {
  list(workspaceId: string): Promise<Policy[]>
  create(input: PolicyInput): Promise<Policy>
  update(id: string, input: PolicyInput): Promise<Policy>
  delete(id: string, workspaceId: string): Promise<void>
  setStatus(id: string, status: PolicyToggleStatus, workspaceId: string): Promise<Policy>
  submit(id: string, workspaceId: string, note: string): Promise<Policy>
  approve(id: string, workspaceId: string, note: string): Promise<Policy>
  reject(id: string, workspaceId: string, note: string): Promise<Policy>
  listHistory(id: string, workspaceId: string): Promise<PolicyApprovalEvent[]>
  listActivity(workspaceId: string): Promise<PolicyActivity[]>
  recordActivity(policy: Pick<Policy, 'id' | 'name' | 'workspaceId'>, type: PolicyActivityType, ownerId: string): Promise<void>
}
