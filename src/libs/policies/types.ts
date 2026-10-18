export type Policy = {
  id: string
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
export type PolicyActivity = { id: string; policyId: string; policyName: string; type: PolicyActivityType; occurredAt: string }
export type PolicyFields = Pick<Policy, 'name' | 'description' | 'labels' | 'status' | 'effectiveFrom' | 'effectiveUntil'>
export type PolicyInput = PolicyFields & Pick<Policy, 'ownerId' | 'createdBy'>
export type PolicyDraftInput = PolicyFields
export type PolicyRepository = {
  list(): Promise<Policy[]>
  create(input: PolicyInput): Promise<Policy>
  update(id: string, input: PolicyInput): Promise<Policy>
  delete(id: string): Promise<void>
  setStatus(id: string, status: PolicyStatus): Promise<Policy>
  listActivity(): Promise<PolicyActivity[]>
  recordActivity(policy: Pick<Policy, 'id' | 'name'>, type: PolicyActivityType): Promise<void>
}
