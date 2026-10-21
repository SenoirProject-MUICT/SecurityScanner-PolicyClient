import { mockPolicyRepository } from './mock'
import { apiPolicyRepository } from './api'
import { useRuntimeModeStore } from '@/stores/runtime-mode-store'
import type { Policy, PolicyActivity, PolicyActivityType, PolicyApprovalEvent, PolicyInput, PolicyToggleStatus } from './types'

export type { Policy, PolicyActivity, PolicyActivityType, PolicyApprovalAction, PolicyApprovalEvent, PolicyDraftInput, PolicyFields, PolicyInput, PolicyStatus, PolicySubmitStatus, PolicyToggleStatus } from './types'
export { getPolicyLifecycle, isPolicyApproved, policyLifecycleLabels, toDateKey } from './status'

const isProd = useRuntimeModeStore.getState().isProd
const repository = isProd ? apiPolicyRepository : mockPolicyRepository

export const listPolicies = (workspaceId: string): Promise<Policy[]> => repository.list(workspaceId)
export const createPolicy = (input: PolicyInput): Promise<Policy> => repository.create(input)
export const updatePolicy = (id: string, input: PolicyInput): Promise<Policy> => repository.update(id, input)
export const deletePolicy = (id: string, workspaceId: string): Promise<void> => repository.delete(id, workspaceId)
export const setPolicyStatus = (id: string, status: PolicyToggleStatus, workspaceId: string): Promise<Policy> => repository.setStatus(id, status, workspaceId)
export const submitPolicy = (id: string, workspaceId: string, note = ''): Promise<Policy> => repository.submit(id, workspaceId, note)
export const approvePolicy = (id: string, workspaceId: string, note = ''): Promise<Policy> => repository.approve(id, workspaceId, note)
export const rejectPolicy = (id: string, workspaceId: string, note: string): Promise<Policy> => repository.reject(id, workspaceId, note)
export const listPolicyHistory = (id: string, workspaceId: string): Promise<PolicyApprovalEvent[]> => repository.listHistory(id, workspaceId)
export const listPolicyActivity = (workspaceId: string): Promise<PolicyActivity[]> => repository.listActivity(workspaceId)
export const recordPolicyActivity = (policy: Pick<Policy, 'id' | 'name' | 'workspaceId'>, type: PolicyActivityType, ownerId: string): Promise<void> => repository.recordActivity(policy, type, ownerId)
