import { create } from 'zustand'
import { createLabel, deleteLabel, listLabels, updateLabel, type PolicyLabel } from '@/libs/labels'
import { useAuthStore } from './auth-store'
import { usePolicyStore } from './policy-store'
import { useWorkspaceStore } from './workspace-store'

type LabelState = {
  labelRecords: PolicyLabel[]
  isLoading: boolean
  initialize: () => Promise<void>
  refresh: () => Promise<void>
  create: (name: string) => Promise<PolicyLabel>
  update: (id: string, name: string) => Promise<PolicyLabel>
  remove: (id: string) => Promise<void>
}

let initialLoad: Promise<void> | null = null

export const useLabelStore = create<LabelState>((set, get) => ({
  labelRecords: [],
  isLoading: true,
  initialize: () => { if (!initialLoad) initialLoad = get().refresh().finally(() => { initialLoad = null }); return initialLoad },
  refresh: async () => {
    set({ isLoading: true })
    try {
      const workspaceId = useWorkspaceStore.getState().selectedWorkspaceId
      if (!workspaceId) { set({ labelRecords: [] }); return }
      set({ labelRecords: await listLabels(workspaceId) })
    } catch { set({ labelRecords: [] }) }
    finally { set({ isLoading: false }) }
  },
  create: async (name) => {
    const user = useAuthStore.getState().user
    if (!user) throw new Error('Sign in before creating a label.')
    const workspaceId = useWorkspaceStore.getState().selectedWorkspaceId
    if (!workspaceId) throw new Error('Choose a workspace before creating a label.')
    const label = await createLabel(name, user.id, user.name, workspaceId)
    set((state) => ({ labelRecords: [...state.labelRecords, label].sort((left, right) => left.name.localeCompare(right.name)) }))
    return label
  },
  update: async (id, name) => {
    const workspaceId = useWorkspaceStore.getState().selectedWorkspaceId
    if (!workspaceId) throw new Error('Choose a workspace before updating a label.')
    const updated = await updateLabel(id, name, workspaceId)
    set((state) => ({ labelRecords: state.labelRecords.map((label) => label.id === id ? updated : label).sort((left, right) => left.name.localeCompare(right.name)) }))
    await usePolicyStore.getState().refresh()
    return updated
  },
  remove: async (id) => {
    const workspaceId = useWorkspaceStore.getState().selectedWorkspaceId
    if (!workspaceId) throw new Error('Choose a workspace before removing a label.')
    await deleteLabel(id, workspaceId)
    set((state) => ({ labelRecords: state.labelRecords.filter((label) => label.id !== id) }))
    await usePolicyStore.getState().refresh()
  },
}))

export function useLabels() {
  const labelState = useLabelStore()
  const policies = usePolicyStore((state) => state.policies)
  const labels = [...new Set([...labelState.labelRecords.map((label) => label.name), ...policies.flatMap((policy) => policy.labels)])].sort((left, right) => left.localeCompare(right))
  return { ...labelState, labels }
}
