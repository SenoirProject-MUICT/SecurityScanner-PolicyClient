import { mockPolicyRepository } from './mock'
import { supabasePolicyRepository } from './supabase'
import { useRuntimeModeStore } from '@/stores/runtime-mode-store'
import type { Policy, PolicyActivity, PolicyActivityType, PolicyInput } from './types'

export { RuntimeMode } from '@/libs/runtime-mode'
export type { Policy, PolicyActivity, PolicyActivityType, PolicyDraftInput, PolicyFields, PolicyInput, PolicyStatus } from './types'
export { getPolicyLifecycle, isPolicyEffective, toDateKey } from './status'

const isProd = useRuntimeModeStore.getState().isProd
const repository = isProd ? supabasePolicyRepository : mockPolicyRepository

export const listPolicies = (workspaceId: string): Promise<Policy[]> => repository.list(workspaceId)
export const createPolicy = (input: PolicyInput): Promise<Policy> => repository.create(input)
export const updatePolicy = (id: string, input: PolicyInput): Promise<Policy> => repository.update(id, input)
export const deletePolicy = (id: string, workspaceId: string): Promise<void> => repository.delete(id, workspaceId)
export const setPolicyStatus = (id: string, status: import('./types').PolicyStatus, workspaceId: string): Promise<Policy> => repository.setStatus(id, status, workspaceId)
export const listPolicyActivity = (workspaceId: string): Promise<PolicyActivity[]> => isProd ? supabasePolicyRepository.listActivity(workspaceId) : mockPolicyRepository.listActivity(workspaceId)
export const recordPolicyActivity = (policy: Pick<Policy, 'id' | 'name' | 'workspaceId'>, type: PolicyActivityType, ownerId: string): Promise<void> => isProd ? supabasePolicyRepository.recordActivity(policy, type, ownerId) : mockPolicyRepository.recordActivity(policy, type, ownerId)
