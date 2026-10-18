import { mockPolicyRepository } from './mock'
import { supabasePolicyRepository } from './supabase'
import { useRuntimeModeStore } from '@/stores/runtime-mode-store'
import type { Policy, PolicyActivity, PolicyActivityType, PolicyInput } from './types'

export { RuntimeMode } from '@/libs/runtime-mode'
export type { Policy, PolicyActivity, PolicyActivityType, PolicyDraftInput, PolicyFields, PolicyInput, PolicyStatus } from './types'
export { getPolicyLifecycle, isPolicyEffective, toDateKey } from './status'

const isProd = useRuntimeModeStore.getState().isProd
const repository = isProd ? supabasePolicyRepository : mockPolicyRepository

export const listPolicies = (): Promise<Policy[]> => repository.list()
export const createPolicy = (input: PolicyInput): Promise<Policy> => repository.create(input)
export const updatePolicy = (id: string, input: PolicyInput): Promise<Policy> => repository.update(id, input)
export const deletePolicy = (id: string): Promise<void> => repository.delete(id)
export const setPolicyStatus = (id: string, status: import('./types').PolicyStatus): Promise<Policy> => repository.setStatus(id, status)
export const listPolicyActivity = (): Promise<PolicyActivity[]> => isProd ? supabasePolicyRepository.listActivity() : mockPolicyRepository.listActivity()
export const recordPolicyActivity = (policy: Pick<Policy, 'id' | 'name'>, type: PolicyActivityType): Promise<void> => isProd ? supabasePolicyRepository.recordActivity(policy, type) : mockPolicyRepository.recordActivity(policy, type)
