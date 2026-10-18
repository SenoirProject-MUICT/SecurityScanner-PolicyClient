import { create } from 'zustand'
import { createPolicy, deletePolicy, listPolicies, listPolicyActivity, recordPolicyActivity, setPolicyStatus, updatePolicy, type Policy, type PolicyActivity, type PolicyDraftInput } from '@/libs/policies'
import { useAuthStore } from './auth-store'
import { useWorkspaceStore } from './workspace-store'

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
    if (!initialLoad) initialLoad = get().refresh().finally(() => { initialLoad = null })
    return initialLoad
  },
  refresh: async () => {
    set({ isLoading: true })
    try {
      const { selectedWorkspaceId: workspaceId, error: workspaceError } = useWorkspaceStore.getState()
      if (!workspaceId) throw new Error(workspaceError || 'No workspace is selected.')
      const [policies, activity] = await Promise.all([listPolicies(workspaceId), listPolicyActivity(workspaceId).catch(() => [])])
      set({ policies: sortPolicies(policies), activity, error: '' })
    }
    catch (cause) { set({ error: toErrorMessage(cause) }) }
    finally { set({ isLoading: false }) }
  },
  create: async (input) => {
    const user = useAuthStore.getState().user
    if (!user) throw new Error('Sign in before creating a policy.')
    const workspaceId = useWorkspaceStore.getState().selectedWorkspaceId
    if (!workspaceId) throw new Error('Choose a workspace before creating a policy.')
    const created = await createPolicy({ ...input, workspaceId, ownerId: user.id, createdBy: user.name })
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
    const workspaceId = useWorkspaceStore.getState().selectedWorkspaceId
    if (!workspaceId) throw new Error('Choose a workspace before updating a policy.')
    const updated = await updatePolicy(id, { ...input, workspaceId, ownerId: user.id, createdBy: user.name })
    set((state) => ({ policies: sortPolicies(state.policies.map((policy) => policy.id === id ? updated : policy)) }))
    if (updated.status === 'draft') await recordActivitySafely(updated, 'draft')
    else if (isScheduled(updated)) await recordActivitySafely(updated, 'scheduled')
    await refreshActivitySafely(set)
    return updated
  },
  remove: async (id) => {
    const removed = get().policies.find((policy) => policy.id === id)
    const workspaceId = useWorkspaceStore.getState().selectedWorkspaceId
    if (!workspaceId) throw new Error('Choose a workspace before removing a policy.')
    await deletePolicy(id, workspaceId)
    set((state) => ({ policies: state.policies.filter((policy) => policy.id !== id) }))
    if (removed) { await recordActivitySafely(removed, 'removed'); await refreshActivitySafely(set) }
  },
  setStatus: async (id, status) => {
    const workspaceId = useWorkspaceStore.getState().selectedWorkspaceId
    if (!workspaceId) throw new Error('Choose a workspace before changing policy status.')
    const updated = await setPolicyStatus(id, status, workspaceId)
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
async function recordActivitySafely(policy: Pick<Policy, 'id' | 'name' | 'workspaceId'>, type: import('@/libs/policies').PolicyActivityType) { const user = useAuthStore.getState().user; if (!user) return; try { await recordPolicyActivity(policy, type, user.id) } catch { /* Activity history must not block a policy change. */ } }
async function refreshActivitySafely(set: (partial: Partial<PolicyState> | ((state: PolicyState) => Partial<PolicyState>)) => void) { const workspaceId = useWorkspaceStore.getState().selectedWorkspaceId; if (!workspaceId) return; try { set({ activity: await listPolicyActivity(workspaceId) }) } catch { /* The policy itself remains usable if activity storage is unavailable. */ } }
