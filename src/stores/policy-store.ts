import { create } from 'zustand'
import { createPolicy, deletePolicy, listPolicies, listPolicyActivity, recordPolicyActivity, setPolicyStatus, updatePolicy, type Policy, type PolicyActivity, type PolicyDraftInput } from '@/libs/policies'
import { useAuthStore } from './auth-store'

type PolicyState = {
  policies: Policy[]
  activity: PolicyActivity[]
  isLoading: boolean
  error: string
  initialize: () => Promise<void>
  refresh: () => Promise<void>
  create: (input: PolicyDraftInput) => Promise<Policy>
  update: (id: string, input: PolicyDraftInput) => Promise<Policy>
  remove: (id: string) => Promise<void>
  setStatus: (id: string, status: Policy['status']) => Promise<Policy>
}

let initialLoad: Promise<void> | null = null

export const usePolicyStore = create<PolicyState>((set, get) => ({
  policies: [],
  activity: [],
  isLoading: true,
  error: '',
  initialize: () => {
    if (!initialLoad) initialLoad = get().refresh()
    return initialLoad
  },
  refresh: async () => {
    set({ isLoading: true })
    try {
      const [policies, activity] = await Promise.all([listPolicies(), listPolicyActivity().catch(() => [])])
      set({ policies: sortPolicies(policies), activity, error: '' })
    }
    catch (cause) { set({ error: toErrorMessage(cause) }) }
    finally { set({ isLoading: false }) }
  },
  create: async (input) => {
    const user = useAuthStore.getState().user
    if (!user) throw new Error('Sign in before creating a policy.')
    const created = await createPolicy({ ...input, ownerId: user.id, createdBy: user.name })
    set((state) => ({ policies: sortPolicies([created, ...state.policies]) }))
    await recordActivitySafely(created, 'added')
    if (created.status === 'draft') await recordActivitySafely(created, 'draft')
    else if (isScheduled(created)) await recordActivitySafely(created, 'scheduled')
    await refreshActivitySafely(set)
    return created
  },
  update: async (id, input) => {
    const user = useAuthStore.getState().user
    if (!user) throw new Error('Sign in before updating a policy.')
    const updated = await updatePolicy(id, { ...input, ownerId: user.id, createdBy: user.name })
    set((state) => ({ policies: sortPolicies(state.policies.map((policy) => policy.id === id ? updated : policy)) }))
    if (updated.status === 'draft') await recordActivitySafely(updated, 'draft')
    else if (isScheduled(updated)) await recordActivitySafely(updated, 'scheduled')
    await refreshActivitySafely(set)
    return updated
  },
  remove: async (id) => {
    const removed = get().policies.find((policy) => policy.id === id)
    await deletePolicy(id)
    set((state) => ({ policies: state.policies.filter((policy) => policy.id !== id) }))
    if (removed) { await recordActivitySafely(removed, 'removed'); await refreshActivitySafely(set) }
  },
  setStatus: async (id, status) => {
    const updated = await setPolicyStatus(id, status)
    set((state) => ({ policies: sortPolicies(state.policies.map((policy) => policy.id === id ? updated : policy)) }))
    if (updated.status === 'draft') await recordActivitySafely(updated, 'draft')
    else if (isScheduled(updated)) await recordActivitySafely(updated, 'scheduled')
    await refreshActivitySafely(set)
    return updated
  },
}))

export function usePolicies() {
  return usePolicyStore()
}

function sortPolicies(rows: Policy[]) { return [...rows].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)) }
function toErrorMessage(error: unknown) { return error instanceof Error ? error.message : 'Could not load policies.' }
function isScheduled(policy: Policy) { return policy.status === 'active' && Boolean(policy.effectiveFrom && policy.effectiveFrom > new Date().toISOString().slice(0, 10)) }
async function recordActivitySafely(policy: Pick<Policy, 'id' | 'name'>, type: import('@/libs/policies').PolicyActivityType) { try { await recordPolicyActivity(policy, type) } catch { /* Activity history must not block a policy change. */ } }
async function refreshActivitySafely(set: (partial: Partial<PolicyState> | ((state: PolicyState) => Partial<PolicyState>)) => void) { try { set({ activity: await listPolicyActivity() }) } catch { /* The policy itself remains usable if activity storage is unavailable. */ } }
