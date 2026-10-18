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
}

export type PolicyStatus = 'draft' | 'active' | 'inactive'
export type PolicyActivityType = 'added' | 'removed' | 'draft' | 'scheduled'
export type PolicyActivity = { id: string; workspaceId: string; policyId: string; policyName: string; type: PolicyActivityType; occurredAt: string }
export type PolicyFields = Pick<Policy, 'name' | 'description' | 'labels' | 'status' | 'effectiveFrom' | 'effectiveUntil'>
export type PolicyInput = PolicyFields & Pick<Policy, 'workspaceId' | 'ownerId' | 'createdBy'>
export type PolicyDraftInput = PolicyFields
export type PolicyRepository = {
  list(workspaceId: string): Promise<Policy[]>
  create(input: PolicyInput): Promise<Policy>
  update(id: string, input: PolicyInput): Promise<Policy>
  delete(id: string, workspaceId: string): Promise<void>
  setStatus(id: string, status: PolicyStatus, workspaceId: string): Promise<Policy>
  listActivity(workspaceId: string): Promise<PolicyActivity[]>
  recordActivity(policy: Pick<Policy, 'id' | 'name' | 'workspaceId'>, type: PolicyActivityType, ownerId: string): Promise<void>
}
