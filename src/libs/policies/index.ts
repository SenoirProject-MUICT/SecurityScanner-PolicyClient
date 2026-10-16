import { mockPolicyRepository } from './mock'
import { supabasePolicyRepository } from './supabase'
import { supabaseSettings } from '@/libs/supabase'
import type { DataMode, Policy, PolicyActivity, PolicyActivityType, PolicyInput } from './types'

export type { DataMode, Policy, PolicyActivity, PolicyActivityType, PolicyDraftInput, PolicyFields, PolicyInput, PolicyStatus } from './types'
export { getPolicyLifecycle, isPolicyEffective, toDateKey } from './status'

const requestedMode = import.meta.env.VITE_DATA_MODE?.trim().toLowerCase()
export const activeMode: DataMode = requestedMode === 'supabase' && supabaseSettings.configured ? 'supabase' : 'mock'

const repository = activeMode === 'supabase' ? supabasePolicyRepository : mockPolicyRepository

export const listPolicies = (): Promise<Policy[]> => repository.list()
export const createPolicy = (input: PolicyInput): Promise<Policy> => repository.create(input)
export const updatePolicy = (id: string, input: PolicyInput): Promise<Policy> => repository.update(id, input)
export const deletePolicy = (id: string): Promise<void> => repository.delete(id)
export const setPolicyStatus = (id: string, status: import('./types').PolicyStatus): Promise<Policy> => repository.setStatus(id, status)
export const listPolicyActivity = (): Promise<PolicyActivity[]> => activeMode === 'supabase' ? supabasePolicyRepository.listActivity() : mockPolicyRepository.listActivity()
export const recordPolicyActivity = (policy: Pick<Policy, 'id' | 'name'>, type: PolicyActivityType): Promise<void> => activeMode === 'supabase' ? supabasePolicyRepository.recordActivity(policy, type) : mockPolicyRepository.recordActivity(policy, type)
